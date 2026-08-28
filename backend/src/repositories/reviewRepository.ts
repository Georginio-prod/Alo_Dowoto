import type { PrismaClient, Review } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des notations mutuelles client/prestataire (`prisma.review`).
 * Porté iso depuis `server/utils/reviewStore.ts` (ADR-0016), déjà persisté en
 * base (ADR-0015). Client Prisma injecté (testable sans base). Seule la lecture
 * par cible est exposée pour l'instant — c'est tout ce dont `GET /api/reviews/me`
 * a besoin ; les autres lectures (admin, annuaire) viendront avec leurs domaines.
 */
export interface ReviewRepository {
  /** Avis reçus par `targetId`, dans l'ordre chronologique de dépôt. */
  findByTarget(targetId: string): Promise<Review[]>
}

export function createReviewRepository(db: PrismaClient): ReviewRepository {
  return {
    findByTarget(targetId) {
      return db.review.findMany({ where: { targetId }, orderBy: { createdAt: 'asc' } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const reviewRepository = createReviewRepository(prisma)
