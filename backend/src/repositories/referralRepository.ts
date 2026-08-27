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
}

export function createReferralRepository(db: PrismaClient): ReferralRepository {
  return {
    findByReferrer(referrerId) {
      return db.referral.findMany({ where: { referrerId }, orderBy: { createdAt: 'desc' } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const referralRepository = createReferralRepository(prisma)
