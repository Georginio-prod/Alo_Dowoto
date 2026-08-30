import type { KycDecision } from '@prisma/client'
import { kycDecisionRepository, type KycDecisionRepository } from '../repositories/kycDecisionRepository'
import { verificationService } from './verificationService'

/**
 * Décisions admin sur les vérifications d'identité (#dashboard-admin), portées
 * iso depuis `server/utils/kycDecisionStore.ts` (ADR-0017). Ce lot ne porte que
 * les LECTURES (historique par utilisateur, file d'attente) ; les mutations
 * approve/reject — qui révoquent réellement le badge sur refus — viennent avec
 * le sous-lot 3.
 */

export interface KycDecisionRecord {
  id: string
  userId: string
  status: 'approved' | 'rejected'
  reason: string | null
  reviewedBy: string
  reviewedAt: number
}

function toRecord(row: KycDecision): KycDecisionRecord {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    reason: row.reason,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt.getTime(),
  }
}

export interface KycQueueEntry {
  userId: string
  submittedAt: number
  hasImages: boolean
  latestDecision: KycDecisionRecord | null
}

export function createKycDecisionService(repo: KycDecisionRepository = kycDecisionRepository) {
  return {
    /** Historique des décisions pour un utilisateur, la plus récente d'abord. */
    async listKycDecisionsForUser(userId: string): Promise<KycDecisionRecord[]> {
      return (await repo.listByUser(userId)).map(toRecord)
    },

    /** Valide/trace la vérification d'identité (n'altère pas le badge déjà auto-certifié). Iso `approveKyc`. */
    async approveKyc(userId: string, reviewerId: string, reason?: string): Promise<KycDecisionRecord> {
      const row = await repo.create({ userId, status: 'approved', reason: reason?.trim() || null, reviewedBy: reviewerId })
      return toRecord(row)
    },

    /**
     * Refuse la vérification et **révoque réellement le badge** (une soumission
     * auto-certifie à l'envoi ; un refus admin doit pouvoir le retirer). Iso `rejectKyc`.
     */
    async rejectKyc(userId: string, reviewerId: string, reason: string): Promise<KycDecisionRecord> {
      const row = await repo.create({ userId, status: 'rejected', reason: reason.trim(), reviewedBy: reviewerId })
      await verificationService.deleteVerification(userId)
      return toRecord(row)
    },

    /** File des soumissions KYC avec leur dernière décision, la plus récente en premier. */
    async listKycQueue(): Promise<KycQueueEntry[]> {
      const submissions = await verificationService.listAllVerifications()
      const entries: KycQueueEntry[] = []
      for (const submission of submissions) {
        const decisions = await repo.listByUser(submission.userId)
        entries.push({
          userId: submission.userId,
          submittedAt: submission.submittedAt,
          hasImages: submission.idCardImage !== null && submission.passportPhotoImage !== null,
          latestDecision: decisions[0] ? toRecord(decisions[0]) : null,
        })
      }
      return entries
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const kycDecisionService = createKycDecisionService()
