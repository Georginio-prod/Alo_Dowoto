import { prisma } from '~~/server/utils/prisma'
import { deleteVerification, getVerification } from '~~/server/utils/verificationStore'

/**
 * Décisions admin sur les vérifications d'identité (#dashboard-admin, modules
 * Prestataires/Chercheurs) — persistées en base (KycDecision), contrairement
 * aux soumissions elles-mêmes (server/utils/verificationStore.ts, encore en
 * mémoire, voir #45/#46).
 *
 * Un refus révoque réellement le badge « Vérifié » (deleteVerification, déjà
 * utilisé par le droit à l'effacement #286). Une validation confirme/trace la
 * décision sans changer le comportement d'auto-certification existant : la
 * soumission accorde déjà le badge (voir verificationStore.submitVerification),
 * ce dashboard ajoute la traçabilité qui manquait plutôt qu'un nouveau
 * verrou — voir la doc du modèle KycDecision dans prisma/schema.prisma.
 */

export interface KycDecisionRecord {
  id: string
  userId: string
  status: 'approved' | 'rejected'
  reason: string | null
  reviewedBy: string
  reviewedAt: number
}

export async function approveKyc(userId: string, reviewerId: string, reason?: string): Promise<KycDecisionRecord> {
  const row = await prisma.kycDecision.create({
    data: { userId, status: 'approved', reason: reason?.trim() || null, reviewedBy: reviewerId },
  })
  return { id: row.id, userId: row.userId, status: 'approved', reason: row.reason, reviewedBy: row.reviewedBy, reviewedAt: row.reviewedAt.getTime() }
}

export async function rejectKyc(userId: string, reviewerId: string, reason: string): Promise<KycDecisionRecord> {
  const row = await prisma.kycDecision.create({
    data: { userId, status: 'rejected', reason: reason.trim(), reviewedBy: reviewerId },
  })
  // Révocation réelle du badge : une soumission auto-certifie à l'envoi
  // (verificationStore.submitVerification), un refus admin doit donc pouvoir
  // le retirer pour de vrai plutôt que d'être purement déclaratif.
  deleteVerification(userId)
  return { id: row.id, userId: row.userId, status: 'rejected', reason: row.reason, reviewedBy: row.reviewedBy, reviewedAt: row.reviewedAt.getTime() }
}

/** Historique des décisions pour un utilisateur, la plus récente d'abord. */
export async function listKycDecisionsForUser(userId: string): Promise<KycDecisionRecord[]> {
  const rows = await prisma.kycDecision.findMany({ where: { userId }, orderBy: { reviewedAt: 'desc' } })
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    status: row.status as 'approved' | 'rejected',
    reason: row.reason,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt.getTime(),
  }))
}

export interface KycQueueEntry {
  userId: string
  submittedAt: number
  hasImages: boolean
  latestDecision: KycDecisionRecord | null
}

/** File des soumissions KYC avec leur dernière décision, la plus récente en premier (#dashboard-admin). */
export async function listKycQueue(): Promise<KycQueueEntry[]> {
  const { listAllVerifications } = await import('~~/server/utils/verificationStore')
  const submissions = listAllVerifications()
  const entries: KycQueueEntry[] = []
  for (const submission of submissions) {
    const decisions = await listKycDecisionsForUser(submission.userId)
    entries.push({
      userId: submission.userId,
      submittedAt: submission.submittedAt,
      hasImages: submission.idCardImage !== null && submission.passportPhotoImage !== null,
      latestDecision: decisions[0] ?? null,
    })
  }
  return entries
}

export { getVerification }
