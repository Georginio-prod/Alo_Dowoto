import type { Subscription as PrismaSubscription } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import type { PlanSlug } from '~~/app/data/plans'

/**
 * Persistance des abonnements prestataire en base (Prisma/SQLite, #342,
 * ADR 0013). Contrairement à l'ancien store en mémoire, les abonnements
 * survivent aux redémarrages du serveur.
 *
 * Association 1-1 avec le compte prestataire : un seul abonnement par
 * utilisateur (garanti par les chemins d'écriture ci-dessous, qui ne créent
 * jamais un second abonnement pour un même `userId`).
 */

export type SubscriptionStatus = 'en_attente' | 'actif' | 'expire'

export interface Subscription {
  id: string
  userId: string
  plan: PlanSlug
  status: SubscriptionStatus
  dateDebut: number | null
  dateFin: number | null
  createdAt: number
  /** `true` si la période active courante est l'essai gratuit (#281), pas une période payée. */
  isTrial: boolean
}

/**
 * Durée de l'essai gratuit à la première souscription (#281), affichée
 * depuis toujours sur /abonnement (« Essai gratuit de 14 jours, sans
 * engagement ») et dans PLAN_COMPARISON.
 */
export const TRIAL_DURATION_DAYS = 14

function toSubscription(row: PrismaSubscription): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    plan: row.plan as PlanSlug,
    status: row.status as SubscriptionStatus,
    dateDebut: row.dateDebut?.getTime() ?? null,
    dateFin: row.dateFin?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    isTrial: row.isTrial,
  }
}

/**
 * Crée (ou remet en attente) l'abonnement d'un prestataire pour la formule
 * choisie. Tant qu'il n'est pas actif, resélectionner une formule met
 * simplement à jour l'abonnement existant. Un abonnement déjà actif n'est
 * jamais réécrit par ce chemin (pas de changement/downgrade de formule
 * implicite — non couvert par le prototype actuel).
 */
export async function createPendingSubscription(userId: string, plan: PlanSlug): Promise<Subscription> {
  const existing = await prisma.subscription.findFirst({ where: { userId } })
  if (existing?.status === 'actif') {
    conflict('Un abonnement actif existe déjà.')
  }

  const row = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: { plan, status: 'en_attente', dateDebut: null, dateFin: null, isTrial: false },
      })
    : await prisma.subscription.create({
        data: { userId, plan, status: 'en_attente' },
      })
  return toSubscription(row)
}

export type ActivateTrialResult =
  | { ok: true; subscription: Subscription }
  | { ok: false; error: 'already_used' }

/**
 * Active l'essai gratuit (#281) : réservé à un prestataire n'ayant jamais eu
 * le moindre abonnement (en attente, actif ou expiré) — l'essai ne se
 * consomme qu'une fois, jamais reconductible à chaque changement de formule.
 * Contrairement à `activateSubscription`, aucun paiement préalable requis :
 * la souscription est directement active.
 */
export async function activateTrialSubscription(userId: string, plan: PlanSlug): Promise<ActivateTrialResult> {
  const existing = await prisma.subscription.findFirst({ where: { userId } })
  if (existing) {
    return { ok: false, error: 'already_used' }
  }

  const now = Date.now()
  const row = await prisma.subscription.create({
    data: {
      userId,
      plan,
      status: 'actif',
      dateDebut: new Date(now),
      dateFin: new Date(now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000),
      isTrial: true,
    },
  })
  return { ok: true, subscription: toSubscription(row) }
}

/** Un prestataire n'ayant jamais eu d'abonnement (même abandonné en attente) reste éligible à l'essai gratuit (#281). */
export async function isEligibleForTrial(userId: string): Promise<boolean> {
  const count = await prisma.subscription.count({ where: { userId } })
  return count === 0
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const row = await prisma.subscription.findFirst({ where: { userId } })
  return row ? toSubscription(row) : null
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const row = await prisma.subscription.findUnique({ where: { id } })
  return row ? toSubscription(row) : null
}

/**
 * Active un abonnement en attente après confirmation du paiement (#34).
 * Retourne `null` si l'abonnement n'existe pas.
 */
export async function activateSubscription(id: string, durationDays: number): Promise<Subscription | null> {
  const existing = await prisma.subscription.findUnique({ where: { id } })
  if (!existing) return null

  const now = Date.now()
  const row = await prisma.subscription.update({
    where: { id },
    data: {
      status: 'actif',
      dateDebut: new Date(now),
      dateFin: new Date(now + durationDays * 24 * 60 * 60 * 1000),
    },
  })
  return toSubscription(row)
}
