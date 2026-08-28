import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser } from '../middleware/auth'
import { getMyRating } from '../controllers/reviewController'

/**
 * Notations reçues (#61), porté depuis `server/api/reviews/me.get.ts` (Phase 2,
 * ADR-0017). Monté sous `/api` → `/api/reviews/me`, iso Nitro. Réservé à un
 * utilisateur connecté (401 sinon).
 */
export const reviewsRoutes = Router()

/**
 * @openapi
 * /reviews/me:
 *   get:
 *     tags: [Reviews]
 *     summary: Note moyenne et nombre d'avis reçus par l'utilisateur connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Résumé de notation (0/0 si aucun avis reçu).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rating:
 *                   type: object
 *                   properties:
 *                     average: { type: number, example: 4.5 }
 *                     count: { type: integer, example: 12 }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
reviewsRoutes.get('/reviews/me', requireSessionUser, asyncHandler(getMyRating))
