import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { submitVerificationSchema } from '../validation/schemas/verification'
import { getMyVerification, submitVerification } from '../controllers/verificationController'

/**
 * Vérification d'identité (#180+1), portée depuis `server/api/verification/*`
 * (Phase 2, ADR-0017). Montée sous `/api` → `/api/verification[/me]`, iso Nitro.
 * Ouverte à tout compte connecté (chercheur ou prestataire) ; 401 sinon.
 */
export const verificationRoutes = Router()

/**
 * @openapi
 * /verification/me:
 *   get:
 *     tags: [Verification]
 *     summary: Statut de vérification d'identité du compte connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Statut (aucune image renvoyée).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified: { type: boolean }
 *                 submittedAt: { type: integer, nullable: true }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
verificationRoutes.get('/verification/me', requireSessionUser, asyncHandler(getMyVerification))

/**
 * @openapi
 * /verification:
 *   post:
 *     tags: [Verification]
 *     summary: Soumettre sa vérification d'identité (auto-certification)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idCardImage, passportPhotoImage]
 *             properties:
 *               idCardImage: { type: string, description: "Data URI image (JPEG/PNG, 5 Mo max)." }
 *               passportPhotoImage: { type: string, description: "Data URI image (JPEG/PNG, 5 Mo max)." }
 *     responses:
 *       200:
 *         description: Compte certifié.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified: { type: boolean, example: true }
 *                 submittedAt: { type: integer }
 *       400: { description: Pièces invalides — erreur au format Nitro., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
verificationRoutes.post('/verification', requireSessionUser, validateBody(submitVerificationSchema), asyncHandler(submitVerification))
