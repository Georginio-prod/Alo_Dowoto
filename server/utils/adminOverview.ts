import { prisma } from '~~/server/utils/prisma'
import { getProviderById } from '~~/server/utils/providerDirectory'
import { listAllReviews } from '~~/server/utils/reviewStore'

/**
 * Agrégats de la Vue d'ensemble (#dashboard-admin, module 1) — calculés à la
 * volée à partir des tables Prisma réelles (EscrowOrder, WalletMovement,
 * Subscription, User, Conversation) et du store d'avis en mémoire
 * (server/utils/reviewStore.ts, réel mais volatile — voir docs/admin-dashboard.md).
 *
 * Seul le tout premier palier de l'entonnoir de conversion (« recherche »,
 * avant toute fiche préalable) n'a aucune source de données : aucune trace
 * des consultations de fiches n'est enregistrée aujourd'hui. Il est estimé
 * (voir `ESTIMATED_SEARCH_TO_REQUEST_RATIO` ci-dessous) — TODO: brancher sur
 * un vrai suivi de consultation de fiche prestataire.
 */

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export interface OverviewKpis {
  monthlyRevenue: number
  missionsInProgress: number
  missionsCompleted: number
  amountInEscrow: number
  activeProviders: number
  newClientsThisMonth: number
  cancellationRatePercent: number
  averageRating: number
}

export async function getOverviewKpis(): Promise<OverviewKpis> {
  const monthStart = startOfMonth()

  const [
    monthlyCommissionRows,
    inProgress,
    completedTotal,
    lockedOrders,
    activeProviders,
    newClients,
    ordersThisMonth,
    refundedThisMonth,
  ] = await Promise.all([
    prisma.walletMovement.findMany({ where: { type: 'commission', createdAt: { gte: monthStart } }, select: { amount: true } }),
    prisma.escrowOrder.count({ where: { status: { in: ['in_escrow', 'delivered'] } } }),
    prisma.escrowOrder.count({ where: { status: 'released' } }),
    prisma.escrowOrder.findMany({ where: { status: { in: ['in_escrow', 'delivered'] } }, select: { amount: true } }),
    prisma.subscription.groupBy({ by: ['userId'], where: { status: 'actif' } }),
    prisma.user.count({ where: { role: 'client', createdAt: { gte: monthStart } } }),
    prisma.escrowOrder.count({ where: { createdAt: { gte: monthStart }, status: { not: 'awaiting_payment' } } }),
    prisma.escrowOrder.count({ where: { createdAt: { gte: monthStart }, status: 'refunded' } }),
  ])

  const reviews = listAllReviews()
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return {
    monthlyRevenue: monthlyCommissionRows.reduce((sum, row) => sum + row.amount, 0),
    missionsInProgress: inProgress,
    missionsCompleted: completedTotal,
    amountInEscrow: lockedOrders.reduce((sum, row) => sum + row.amount, 0),
    activeProviders: activeProviders.length,
    newClientsThisMonth: newClients,
    cancellationRatePercent: ordersThisMonth > 0 ? Math.round((refundedThisMonth / ordersThisMonth) * 1000) / 10 : 0,
    averageRating: Math.round(averageRating * 10) / 10,
  }
}

export interface DailyMissionPoint {
  date: string
  count: number
}

/** Missions créées par jour sur les 30 derniers jours (#dashboard-admin). */
export async function getMissionsLast30Days(): Promise<DailyMissionPoint[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const orders = await prisma.escrowOrder.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } })

  const counts = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    counts.set(day, 0)
  }
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10)
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }))
}

export interface RevenueBySector {
  sector: string
  amount: number
}

/** Répartition du CA (commissions) du mois par secteur du prestataire (#dashboard-admin). */
export async function getRevenueBySector(): Promise<RevenueBySector[]> {
  const monthStart = startOfMonth()
  const releasedThisMonth = await prisma.escrowOrder.findMany({
    where: { status: 'released', releasedAt: { gte: monthStart } },
    select: { providerId: true, amount: true },
  })

  const bySector = new Map<string, number>()
  for (const order of releasedThisMonth) {
    const provider = getProviderById(order.providerId)
    const sector = provider?.sector ?? 'autre'
    const commission = Math.round(order.amount * 0.1)
    bySector.set(sector, (bySector.get(sector) ?? 0) + commission)
  }
  return [...bySector.entries()].map(([sector, amount]) => ({ sector, amount })).sort((a, b) => b.amount - a.amount)
}

export interface ConversionFunnel {
  searches: number
  requestsSent: number
  advancesPaid: number
  missionsCompleted: number
  missionsValidated: number
  /** `true` : `searches` est une estimation (pas de suivi de consultation de fiche) — voir docs/admin-dashboard.md. */
  searchesEstimated: boolean
}

/**
 * Ratio appliqué à `requestsSent` pour estimer `searches` tant qu'aucune
 * consultation de fiche n'est tracée. Valeur pragmatique (une fiche envoyée
 * suppose plusieurs consultations en amont) — à remplacer dès qu'un vrai
 * suivi existera.
 */
const ESTIMATED_SEARCH_TO_REQUEST_RATIO = 6

export async function getConversionFunnel(): Promise<ConversionFunnel> {
  const [requestsSent, advancesPaid, missionsCompleted, missionsValidated] = await Promise.all([
    prisma.conversation.count({ where: { firstContactDone: true } }),
    prisma.escrowOrder.count({ where: { status: { not: 'awaiting_payment' } } }),
    prisma.escrowOrder.count({ where: { status: { in: ['delivered', 'released'] } } }),
    prisma.escrowOrder.count({ where: { status: 'released' } }),
  ])

  return {
    searches: requestsSent * ESTIMATED_SEARCH_TO_REQUEST_RATIO,
    requestsSent,
    advancesPaid,
    missionsCompleted,
    missionsValidated,
    searchesEstimated: true,
  }
}

export interface RecentActivityEntry {
  id: string
  kind: 'signup' | 'dispute' | 'release' | 'admin_action'
  label: string
  timestamp: number
}

/** Les 10 dernières actions importantes de la plateforme (#dashboard-admin) — événements métier réels, fusionnés et triés. */
export async function getRecentActivity(limit = 10): Promise<RecentActivityEntry[]> {
  const [signups, disputes, releases] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, createdAt: true, role: true, firstName: true, lastName: true } }),
    prisma.escrowOrder.findMany({ where: { disputedAt: { not: null } }, orderBy: { disputedAt: 'desc' }, take: limit, select: { id: true, disputedAt: true } }),
    prisma.walletMovement.findMany({ where: { type: 'escrow_release' }, orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, createdAt: true, amount: true } }),
  ])

  const entries: RecentActivityEntry[] = [
    ...signups.map((u): RecentActivityEntry => ({
      id: `signup-${u.id}`,
      kind: 'signup',
      label: `Nouvelle inscription : ${[u.firstName, u.lastName].filter(Boolean).join(' ') || 'compte'} (${u.role})`,
      timestamp: u.createdAt.getTime(),
    })),
    ...disputes.map((d): RecentActivityEntry => ({
      id: `dispute-${d.id}`,
      kind: 'dispute',
      label: `Litige ouvert sur la commande ${d.id.slice(0, 8)}`,
      timestamp: d.disputedAt!.getTime(),
    })),
    ...releases.map((r): RecentActivityEntry => ({
      id: `release-${r.id}`,
      kind: 'release',
      label: `Paiement débloqué : ${r.amount.toLocaleString('fr-FR')} F CFA`,
      timestamp: r.createdAt.getTime(),
    })),
  ]

  return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}
