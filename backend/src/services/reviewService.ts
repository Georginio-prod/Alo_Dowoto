import type { Review as PrismaReview } from '@prisma/client'
import { conflict } from '../utils/apiError'
import { reviewRepository, type ReviewRepository } from '../repositories/reviewRepository'

/**
 * Notations reçues (#61). Logique **portée iso** depuis
 * `server/utils/reviewStore.ts#getAverageRating` (ADR-0016) : moyenne et nombre
 * d'avis reçus par un utilisateur, `{ average: 0, count: 0 }` s'il n'en a aucun.
 */
export interface RatingSummary {
  average: number
  count: number
}

export interface Review {
  id: string
  conversationId: string
  authorId: string
  targetId: string
  rating: number
  comment: string | null
  createdAt: number
}

function toReview(row: PrismaReview): Review {
  return {
    id: row.id,
    conversationId: row.conversationId,
    authorId: row.authorId,
    targetId: row.targetId,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.getTime(),
  }
}

export function createReviewService(repo: ReviewRepository = reviewRepository) {
  return {
    /** Moyenne et nombre d'avis reçus par `targetId` (0/0 si aucun avis). */
    async getAverageRating(targetId: string): Promise<RatingSummary> {
      const reviews = await repo.findByTarget(targetId)
      if (reviews.length === 0) return { average: 0, count: 0 }

      const total = reviews.reduce((sum, review) => sum + review.rating, 0)
      return { average: total / reviews.length, count: reviews.length }
    },

    /**
     * Soumet une notation pour la collaboration `conversationId`. Refuse une
     * seconde notation du même auteur (409, unicité #61). Iso `submitReview`.
     */
    async submitReview(conversationId: string, authorId: string, targetId: string, rating: number, comment?: string): Promise<Review> {
      const existing = await repo.findByConversationAuthor(conversationId, authorId)
      if (existing) conflict('Vous avez déjà noté cette collaboration.')
      const row = await repo.create({ conversationId, authorId, targetId, rating, comment: comment?.trim() || null })
      return toReview(row)
    },

    /** Indique si `authorId` a déjà noté la collaboration `conversationId`. */
    async hasReviewed(conversationId: string, authorId: string): Promise<boolean> {
      return (await repo.findByConversationAuthor(conversationId, authorId)) !== null
    },

    /** Un avis par id (modération admin), ou `null`. Iso `reviewStore.getReviewById`. */
    async getReviewById(id: string): Promise<Review | null> {
      const row = await repo.findById(id)
      return row ? toReview(row) : null
    },

    /** Tous les avis, vue de modération admin (#dashboard-admin, module 8). Iso `listAllReviews`. */
    async listAll(): Promise<Review[]> {
      return (await repo.listAll()).map(toReview)
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const reviewService = createReviewService()
