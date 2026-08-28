import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser } from '../middleware/auth'
import { exportAccount, deleteAccount } from '../controllers/accountController'

/**
 * Droits RGPD sur le compte (#286), portés depuis `server/api/account/*`
 * (Phase 2, ADR-0017). Montés sous `/api` → `/api/account/export` et
 * `/api/account/delete`, iso Nitro. Réservés à un utilisateur connecté.
 */
export const accountRoutes = Router()

/**
 * @openapi
 * /account/export:
 *   get:
 *     tags: [Account]
 *     summary: Export des données personnelles du compte connecté (portabilité #286)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Données structurées (jamais les images de vérification).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exportedAt: { type: integer }
 *                 account: { type: object }
 *                 providerProfile: { type: object, nullable: true }
 *                 subscription: { type: object, nullable: true }
 *                 walletBalance: { type: integer }
 *                 verification:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     submittedAt: { type: integer }
 *                     purgedAt: { type: integer, nullable: true }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
accountRoutes.get('/account/export', requireSessionUser, asyncHandler(exportAccount))

/**
 * @openapi
 * /account/delete:
 *   post:
 *     tags: [Account]
 *     summary: Effacement du compte connecté (droit à l'effacement #286)
 *     description: Anonymise le compte, efface les images de vérification et supprime les sessions. L'historique financier est conservé mais dérattaché de l'identité.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Compte anonymisé, cookie de session effacé.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { ok: { type: boolean, example: true } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
accountRoutes.post('/account/delete', requireSessionUser, asyncHandler(deleteAccount))
