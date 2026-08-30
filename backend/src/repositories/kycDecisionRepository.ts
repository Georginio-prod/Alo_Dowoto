import type { KycDecision, KycDecisionStatus, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des décisions KYC admin (`prisma.kycDecision`). Porté iso depuis
 * `server/utils/kycDecisionStore.ts` (ADR-0016) : les décisions sont persistées
 * (contrairement aux soumissions historiquement en mémoire). Client Prisma
 * injecté ; la logique métier (révocation du badge sur refus, file d'attente)
 * reste dans `kycDecisionService`.
 */
export interface CreateKycDecisionInput {
  userId: string
  status: KycDecisionStatus
  reason: string | null
  reviewedBy: string
}

export interface KycDecisionRepository {
  create(input: CreateKycDecisionInput): Promise<KycDecision>
  /** Décisions d'un utilisateur, la plus récente d'abord. */
  listByUser(userId: string): Promise<KycDecision[]>
}

export function createKycDecisionRepository(db: PrismaClient): KycDecisionRepository {
  return {
    create(input) {
      return db.kycDecision.create({ data: input })
    },
    listByUser(userId) {
      return db.kycDecision.findMany({ where: { userId }, orderBy: { reviewedAt: 'desc' } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const kycDecisionRepository = createKycDecisionRepository(prisma)
