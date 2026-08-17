import { prisma } from '~~/server/utils/prisma'
import { getProviderProfile, upsertProviderProfile, type ProviderProfile } from '~~/server/utils/providerStore'
import { getSubscriptionByUserId, type Subscription } from '~~/server/utils/subscriptionStore'
import { getAverageRating, getReviewsForTarget } from '~~/server/utils/reviewStore'
import { getVerification } from '~~/server/utils/verificationStore'
import { listKycDecisionsForUser, type KycDecisionRecord } from '~~/server/utils/kycDecisionStore'
import { toUser, type User } from '~~/server/utils/userStore'
import { listContournementAttemptsForUser } from '~~/server/utils/contournementAttemptStore'

/**
 * Vue admin des comptes prestataire (#dashboard-admin, module 2) : fusionne
 * le compte réel (Prisma User), l'abonnement (Prisma Subscription) et la
 * décision KYC (Prisma KycDecision) avec le profil déclaratif et les avis,
 * encore en mémoire (server/utils/providerStore.ts, server/utils/reviewStore.ts
 * — réels mais volatiles, voir docs/admin-dashboard.md). Les fiches de
 * l'annuaire de démonstration (providerDirectory.ts, ids p01..p14) ne sont
 * volontairement pas listées ici : ce ne sont pas de vrais comptes gérables.
 */

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface AdminProviderSummary {
  id: string
  name: string
  contact: string
  createdAt: number
  status: 'active' | 'suspended'
  riskFlag: boolean
  city: string | null
  sector: string | null
  subscriptionStatus: Subscription['status'] | 'aucun'
  kycStatus: KycStatus
  rating: number
  reviewCount: number
}

async function resolveKycStatus(userId: string): Promise<{ status: KycStatus, decisions: KycDecisionRecord[] }> {
  const submission = getVerification(userId)
  const decisions = await listKycDecisionsForUser(userId)
  if (decisions[0]?.status === 'rejected' && !submission) return { status: 'rejected', decisions }
  if (!submission) return { status: 'none', decisions }
  if (decisions[0]?.status === 'approved') return { status: 'approved', decisions }
  return { status: 'pending', decisions }
}

async function toSummary(user: User): Promise<AdminProviderSummary> {
  const profile = getProviderProfile(user.id)
  const subscription = await getSubscriptionByUserId(user.id)
  const { status: kycStatus } = await resolveKycStatus(user.id)
  const { average, count } = getAverageRating(user.id)

  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username,
    contact: user.contact,
    createdAt: user.createdAt,
    status: user.status,
    riskFlag: user.riskFlag,
    city: profile?.city ?? null,
    sector: profile?.sector ?? null,
    subscriptionStatus: subscription?.status ?? 'aucun',
    kycStatus,
    rating: Math.round(average * 10) / 10,
    reviewCount: count,
  }
}

export interface AdminProviderFilters {
  status?: 'active' | 'suspended'
  sector?: string
  city?: string
  subscriptionStatus?: string
  kycStatus?: KycStatus
  query?: string
}

export interface AdminProviderListResult {
  providers: AdminProviderSummary[]
  total: number
}

export async function listAdminProviders(
  filters: AdminProviderFilters,
  page: number,
  pageSize: number,
): Promise<AdminProviderListResult> {
  const rows = await prisma.user.findMany({
    where: {
      role: 'prestataire',
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.query
        ? {
            OR: [
              { username: { contains: filters.query } },
              { firstName: { contains: filters.query } },
              { lastName: { contains: filters.query } },
              { contact: { contains: filters.query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  let summaries = await Promise.all(rows.map((row) => toSummary(toUser(row))))

  if (filters.sector) summaries = summaries.filter((p) => p.sector === filters.sector)
  if (filters.city) summaries = summaries.filter((p) => p.city === filters.city)
  if (filters.subscriptionStatus) summaries = summaries.filter((p) => p.subscriptionStatus === filters.subscriptionStatus)
  if (filters.kycStatus) summaries = summaries.filter((p) => p.kycStatus === filters.kycStatus)

  const total = summaries.length
  const start = (page - 1) * pageSize
  return { providers: summaries.slice(start, start + pageSize), total }
}

export interface AdminProviderDetail {
  user: User
  profile: ProviderProfile | null
  subscription: Subscription | null
  kyc: { status: KycStatus, decisions: KycDecisionRecord[], hasSubmission: boolean }
  missions: { id: string, status: string, amount: number, createdAt: number, clientId: string }[]
  reviews: { id: string, rating: number, comment: string | null, createdAt: number, authorId: string }[]
  revenueGenerated: number
  reportsReceived: number
}

export async function getAdminProviderDetail(userId: string): Promise<AdminProviderDetail | null> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  if (!row || row.role !== 'prestataire') return null
  const user = toUser(row)

  const [subscription, kycInfo, missions, revenueRows, reportsReceived] = await Promise.all([
    getSubscriptionByUserId(userId),
    resolveKycStatus(userId),
    prisma.escrowOrder.findMany({ where: { providerId: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.walletMovement.findMany({ where: { walletUserId: userId, type: 'escrow_release' }, select: { amount: true } }),
    listContournementAttemptsForUser(userId),
  ])

  return {
    user,
    profile: getProviderProfile(userId),
    subscription,
    kyc: { status: kycInfo.status, decisions: kycInfo.decisions, hasSubmission: getVerification(userId) !== null },
    missions: missions.map((m) => ({ id: m.id, status: m.status, amount: m.amount, createdAt: m.createdAt.getTime(), clientId: m.clientId })),
    reviews: getReviewsForTarget(userId).map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, authorId: r.authorId })),
    revenueGenerated: revenueRows.reduce((sum, row) => sum + row.amount, 0),
    reportsReceived: reportsReceived.length,
  }
}

/** Force la mise à jour des catégories autorisées d'un prestataire (#dashboard-admin, action admin). */
export function adminUpdateProviderCategories(userId: string, sector: string): ProviderProfile | null {
  const existing = getProviderProfile(userId)
  if (!existing) return null
  return upsertProviderProfile(userId, { displayName: existing.displayName, sector })
}

/** Force la mise à jour de la zone géographique d'un prestataire (#dashboard-admin, action admin). */
export function adminUpdateProviderZone(
  userId: string,
  zone: { city?: string, latitude?: number, longitude?: number, quartier?: string, rayonInterventionKm?: number },
): ProviderProfile | null {
  const existing = getProviderProfile(userId)
  if (!existing) return null
  return upsertProviderProfile(userId, { displayName: existing.displayName, sector: existing.sector, ...zone })
}
