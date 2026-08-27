import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser } from '../middleware/auth'
import { getMyReferrals } from '../controllers/referralController'

/**
 * Parrainage (#365), porté depuis `server/api/referrals/me.get.ts` (Phase 2,
 * ADR-0017). Monté sous `/api` → `/api/referrals/me`, iso Nitro. Réservé à un
 * utilisateur connecté (401 sinon).
 */
export const referralsRoutes = Router()

/**
 * @openapi
 * /referrals/me:
 *   get:
 *     tags: [Referrals]
 *     summary: Code de parrainage + tableau de suivi de l'utilisateur connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Code de parrainage, montant du bonus et filleuls.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 referralCode: { type: string }
 *                 bonusAmount: { type: integer, example: 500 }
 *                 referrals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       status: { type: string }
 *                       createdAt: { type: integer }
 *                       rewardedAt: { type: integer, nullable: true }
 *                       referredName: { type: string, nullable: true }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
referralsRoutes.get('/referrals/me', requireSessionUser, asyncHandler(getMyReferrals))
