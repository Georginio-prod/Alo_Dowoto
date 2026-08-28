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

export function createReviewService(repo: ReviewRepository = reviewRepository) {
  return {
    /** Moyenne et nombre d'avis reçus par `targetId` (0/0 si aucun avis). */
    async getAverageRating(targetId: string): Promise<RatingSummary> {
      const reviews = await repo.findByTarget(targetId)
      if (reviews.length === 0) return { average: 0, count: 0 }

      const total = reviews.reduce((sum, review) => sum + review.rating, 0)
      return { average: total / reviews.length, count: reviews.length }
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const reviewService = createReviewService()
