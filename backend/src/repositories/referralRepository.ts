import type { PrismaClient, Referral } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données du parrainage (`prisma.referral`). Porté iso depuis
 * `server/utils/referralStore.ts` (ADR-0016). Client Prisma injecté. Les accès
 * au compte (code de parrainage, filleul) passent par `userRepository`.
 */
export interface ReferralRepository {
  /** Filleuls d'un parrain, du plus récent au plus ancien. */
  findByReferrer(referrerId: string): Promise<Referral[]>
  /** Parrainage dont `referredId` est le filleul (relation 1-1), ou `null`. */
  findByReferred(referredId: string): Promise<Referral | null>
  /**
   * Passe un parrainage `pending` à `rewarded` (idempotent via
   * `where: { status: 'pending' }`) et renvoie le nombre de lignes affectées :
   * 0 = déjà récompensé (double confirmation concurrente).
   */
  markRewarded(id: string): Promise<number>
}

export function createReferralRepository(db: PrismaClient): ReferralRepository {
  return {
    findByReferrer(referrerId) {
      return db.referral.findMany({ where: { referrerId }, orderBy: { createdAt: 'desc' } })
    },
    findByReferred(referredId) {
      return db.referral.findUnique({ where: { referredId } })
    },
    async markRewarded(id) {
      const result = await db.referral.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'rewarded', rewardedAt: new Date() },
      })
      return result.count
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const referralRepository = createReferralRepository(prisma)
