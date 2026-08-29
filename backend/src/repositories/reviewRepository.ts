import type { PrismaClient, Review } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des notations mutuelles client/prestataire (`prisma.review`).
 * Porté iso depuis `server/utils/reviewStore.ts` (ADR-0016), déjà persisté en
 * base (ADR-0015). Client Prisma injecté (testable sans base). Seule la lecture
 * par cible est exposée pour l'instant — c'est tout ce dont `GET /api/reviews/me`
 * a besoin ; les autres lectures (admin, annuaire) viendront avec leurs domaines.
 */
export interface CreateReviewInput {
  conversationId: string
  authorId: string
  targetId: string
  rating: number
  comment: string | null
}

export interface ReviewRepository {
  /** Avis reçus par `targetId`, dans l'ordre chronologique de dépôt. */
  findByTarget(targetId: string): Promise<Review[]>
  /** Avis déposé par `authorId` sur la collaboration `conversationId`, ou `null` (unicité #61). */
  findByConversationAuthor(conversationId: string, authorId: string): Promise<Review | null>
  create(input: CreateReviewInput): Promise<Review>
}

export function createReviewRepository(db: PrismaClient): ReviewRepository {
  return {
    findByTarget(targetId) {
      return db.review.findMany({ where: { targetId }, orderBy: { createdAt: 'asc' } })
    },
    findByConversationAuthor(conversationId, authorId) {
      return db.review.findUnique({ where: { conversationId_authorId: { conversationId, authorId } } })
    },
    create(input) {
      return db.review.create({ data: input })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const reviewRepository = createReviewRepository(prisma)
