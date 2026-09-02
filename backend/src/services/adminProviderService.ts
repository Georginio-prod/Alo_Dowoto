import { prisma } from '../config/prisma'
import { toUser, type AdminUserView } from './userService'
import { providerProfileService, type ProviderProfile } from './providerProfileService'
import { subscriptionService, type Subscription } from './subscriptionService'
import { reviewService } from './reviewService'
import { verificationService } from './verificationService'
import { kycDecisionService, type KycDecisionRecord } from './kycDecisionService'
import { contournementAttemptService } from './contournementAttemptService'

/**
 * Vue admin des comptes prestataire (#dashboard-admin, module 2), portée iso
 * depuis `server/utils/adminProviderStore.ts` (ADR-0017) : fusionne le compte
 * réel (Prisma User), le profil déclaratif (`providerProfileService`),
 * l'abonnement (`subscriptionService`), la décision KYC (`kycDecisionService`)
 * et les avis (`reviewService`). Les fiches de l'annuaire de démonstration
 * (`providerDirectory`, ids p01…p14) ne sont volontairement pas gérées ici : ce
 * ne sont pas de vrais comptes.
 */

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'

async function resolveKycStatus(userId: string): Promise<{ status: KycStatus; decisions: KycDecisionRecord[] }> {
  const submission = await verificationService.getVerification(userId)
  const decisions = await kycDecisionService.listKycDecisionsForUser(userId)
  if (decisions[0]?.status === 'rejected' && !submission) return { status: 'rejected', decisions }
  if (!submission) return { status: 'none', decisions }
  if (decisions[0]?.status === 'approved') return { status: 'approved', decisions }
  return { status: 'pending', decisions }
}

export interface AdminProviderDetail {
  user: AdminUserView
  profile: ProviderProfile | null
  subscription: Subscription | null
  kyc: { status: KycStatus; decisions: KycDecisionRecord[]; hasSubmission: boolean }
  missions: { id: string; status: string; amount: number; createdAt: number; clientId: string }[]
  reviews: { id: string; rating: number; comment: string | null; createdAt: number; authorId: string }[]
  revenueGenerated: number
  reportsReceived: number
}

export async function getAdminProviderDetail(userId: string): Promise<AdminProviderDetail | null> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  if (!row || row.role !== 'prestataire') return null
  const user = toUser(row)

  const [subscription, kycInfo, missions, revenueRows, reports, reviews, submission, profile] = await Promise.all([
    subscriptionService.getSubscriptionByUserId(userId),
    resolveKycStatus(userId),
    prisma.escrowOrder.findMany({ where: { providerId: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.walletMovement.findMany({ where: { walletUserId: userId, type: 'escrow_release' }, select: { amount: true } }),
    contournementAttemptService.listAttemptsForUser(userId),
    reviewService.getReviewsForTarget(userId),
    verificationService.getVerification(userId),
    providerProfileService.getProviderProfile(userId),
  ])

  return {
    user,
    profile,
    subscription,
    kyc: { status: kycInfo.status, decisions: kycInfo.decisions, hasSubmission: submission !== null },
    missions: missions.map((m) => ({ id: m.id, status: m.status, amount: m.amount, createdAt: m.createdAt.getTime(), clientId: m.clientId })),
    reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, authorId: r.authorId })),
    revenueGenerated: revenueRows.reduce((sum, row) => sum + row.amount, 0),
    reportsReceived: reports.length,
  }
}

/** Force la mise à jour des catégories autorisées d'un prestataire (#dashboard-admin, module 2). */
export async function adminUpdateProviderCategories(userId: string, sector: string): Promise<ProviderProfile | null> {
  const existing = await providerProfileService.getProviderProfile(userId)
  if (!existing) return null
  return providerProfileService.upsertProviderProfile(userId, { displayName: existing.displayName, sector })
}

export interface ProviderZonePatch {
  city?: string
  quartier?: string
  latitude?: number
  longitude?: number
  rayonInterventionKm?: number
}

/** Force la mise à jour de la zone géographique d'intervention d'un prestataire (#dashboard-admin, module 2). */
export async function adminUpdateProviderZone(userId: string, zone: ProviderZonePatch): Promise<ProviderProfile | null> {
  const existing = await providerProfileService.getProviderProfile(userId)
  if (!existing) return null
  return providerProfileService.upsertProviderProfile(userId, { displayName: existing.displayName, sector: existing.sector, ...zone })
}
