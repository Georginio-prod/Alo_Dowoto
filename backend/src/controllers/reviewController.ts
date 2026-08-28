import type { Request, Response } from 'express'
import { authUser } from '../utils/authUser'
import { reviewService } from '../services/reviewService'

/**
 * Handler des notations reçues (#61). Porté iso depuis
 * `server/api/reviews/me.get.ts` (ADR-0016). Réservé à un utilisateur connecté
 * (`requireSessionUser` monté sur la route).
 */

/** GET /api/reviews/me → { rating: { average, count } } (note moyenne reçue). */
export async function getMyRating(req: Request, res: Response): Promise<void> {
  const { average, count } = await reviewService.getAverageRating(authUser(req).id)
  res.json({ rating: { average, count } })
}
