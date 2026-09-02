import { prisma } from '../config/prisma'
import { contournementAttemptService } from './contournementAttemptService'
import { toUser } from './userService'

/**
 * Anti-désintermédiation (#dashboard-admin, module 9), porté iso depuis
 * `server/utils/adminAntiCircumventionStore.ts` (ADR-0017) — deux signaux réels :
 *  - messages in-app contenant un numéro/email/mention hors plateforme
 *    (ContournementAttempt, Prisma, déjà journalisés par la messagerie).
 *  - chute anormale du nombre de missions d'un prestataire dont l'abonnement
 *    reste actif (comparaison EscrowOrder sur deux fenêtres de 30 jours).
 * Le troisième signal du cahier des charges (chercheurs consultant une fiche
 * sans jamais payer d'avance) n'a aucune source de données aujourd'hui —
 * aucune consultation de fiche n'est journalisée. Isolé dans
 * `getDemoBrowseWithoutPaySignals`, clairement marqué TODO.
 */

export interface ContournementSignal {
  userId: string
  userName: string
  attemptCount: number
  lastAttemptAt: number
  reasons: string[]
}

export async function listContournementSignals(): Promise<ContournementSignal[]> {
  const attempts = await contournementAttemptService.listAttempts()
  const byUser = new Map<string, { count: number; last: number; reasons: Set<string> }>()
  for (const attempt of attempts) {
    const entry = byUser.get(attempt.userId) ?? { count: 0, last: 0, reasons: new Set<string>() }
    entry.count += 1
    entry.last = Math.max(entry.last, attempt.createdAt)
    entry.reasons.add(attempt.reason)
    byUser.set(attempt.userId, entry)
  }

  const userIds = [...byUser.keys()]
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } })
  const nameById = new Map(users.map((row) => {
    const user = toUser(row)
    return [user.id, [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || user.id.slice(0, 8)]
  }))

  return [...byUser.entries()]
    .map(([userId, entry]) => ({ userId, userName: nameById.get(userId) ?? userId.slice(0, 8), attemptCount: entry.count, lastAttemptAt: entry.last, reasons: [...entry.reasons] }))
    .sort((a, b) => b.attemptCount - a.attemptCount)
}

export interface ProviderMissionDropSignal {
  providerId: string
  providerName: string
  recentCount: number
  previousCount: number
  dropPercent: number
}

/** Prestataires dont le nombre de missions a chuté d'au moins 50% (fenêtre 30j vs 30j précédents) alors que l'abonnement reste actif. */
export async function listMissionDropSignals(): Promise<ProviderMissionDropSignal[]> {
  const now = Date.now()
  const windowMs = 30 * 24 * 60 * 60 * 1000
  const activeSubs = await prisma.subscription.findMany({ where: { status: 'actif' }, select: { userId: true } })

  const signals: ProviderMissionDropSignal[] = []
  for (const sub of activeSubs) {
    const [recentCount, previousCount] = await Promise.all([
      prisma.escrowOrder.count({ where: { providerId: sub.userId, createdAt: { gte: new Date(now - windowMs) } } }),
      prisma.escrowOrder.count({ where: { providerId: sub.userId, createdAt: { gte: new Date(now - 2 * windowMs), lt: new Date(now - windowMs) } } }),
    ])
    if (previousCount >= 3 && recentCount <= previousCount / 2) {
      const user = await prisma.user.findUnique({ where: { id: sub.userId } })
      const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username : sub.userId.slice(0, 8)
      signals.push({ providerId: sub.userId, providerName: name, recentCount, previousCount, dropPercent: Math.round((1 - recentCount / previousCount) * 100) })
    }
  }
  return signals.sort((a, b) => b.dropPercent - a.dropPercent)
}

export interface RiskScoreEntry {
  userId: string
  userName: string
  score: number
  attemptCount: number
  falsePositive: boolean
}

/** Score de risque (0-100) par prestataire, dérivé des tentatives de contournement — exclut les faux positifs marqués. */
export async function listProviderRiskScores(): Promise<RiskScoreEntry[]> {
  const [signals, falsePositives] = await Promise.all([
    listContournementSignals(),
    prisma.riskFalsePositive.findMany({ select: { userId: true } }),
  ])
  const falsePositiveIds = new Set(falsePositives.map((f) => f.userId))

  return signals.map((signal) => ({
    userId: signal.userId,
    userName: signal.userName,
    score: falsePositiveIds.has(signal.userId) ? 0 : Math.min(100, signal.attemptCount * 20),
    attemptCount: signal.attemptCount,
    falsePositive: falsePositiveIds.has(signal.userId),
  })).sort((a, b) => b.score - a.score)
}

export async function markFalsePositive(userId: string, markedBy: string, note?: string): Promise<void> {
  await prisma.riskFalsePositive.upsert({
    where: { userId },
    create: { userId, markedBy, note: note ?? null },
    update: { markedBy, note: note ?? null, markedAt: new Date() },
  })
}

export interface DemoBrowseWithoutPaySignal {
  clientId: string
  clientName: string
  viewsCount: number
  paidAdvancesCount: number
}

/**
 * Signal démonstratif (#dashboard-admin, module 9) — « chercheurs qui consultent
 * une fiche prestataire sans jamais payer d'avance ». Aucune consultation de
 * fiche n'est journalisée aujourd'hui (pas de table de vues/analytics dans le
 * schéma) : ce signal n'a donc, à ce jour, aucune source de données réelle.
 * Porté iso depuis `server/utils/adminAntiCircumventionDemo.ts` (ADR-0017).
 *
 * TODO: brancher sur une vraie source — par exemple journaliser une ligne à
 * chaque `GET /api/providers/:id` dans une nouvelle table `ProfileView`, puis
 * calculer ici le ratio consultations/avances payées par chercheur.
 */
export function getDemoBrowseWithoutPaySignals(): DemoBrowseWithoutPaySignal[] {
  return [
    { clientId: 'demo-client-1', clientName: 'Chercheur démo A', viewsCount: 14, paidAdvancesCount: 0 },
    { clientId: 'demo-client-2', clientName: 'Chercheur démo B', viewsCount: 9, paidAdvancesCount: 0 },
  ]
}
