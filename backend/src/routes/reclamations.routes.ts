import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { validateBody } from '../validation/validate'
import { createComplaintSchema } from '../validation/schemas/reclamations'
import { createComplaint } from '../controllers/complaintController'

/**
 * Réclamations (#357), portées depuis `server/api/reclamations/**` (Phase 2,
 * ADR-0017). Monté sous `/api` → `/api/reclamations`, iso Nitro. Ouvert à tout
 * visiteur ; le compte est rattaché si une session cookie existe (voir le
 * controller).
 */
export const reclamationsRoutes = Router()

/**
 * @openapi
 * /reclamations:
 *   post:
 *     tags: [Reclamations]
 *     summary: Déposer une réclamation (ouvert à tout visiteur)
 *     description: >-
 *       Le compte connecté est rattaché si un cookie de session `wt_session` est
 *       présent, sans être requis (un jeton Bearer n'est PAS pris en compte ici).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, subject, message, contactEmail]
 *             properties:
 *               category: { type: string, enum: [prestataire, chercheur, paiement, compte, technique, autre] }
 *               subject: { type: string, minLength: 3, maxLength: 120 }
 *               message: { type: string, minLength: 10, maxLength: 2000 }
 *               contactEmail: { type: string, description: Email ou téléphone de contact pour le suivi. }
 *     responses:
 *       200:
 *         description: Réclamation enregistrée ; référence de suivi.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference: { type: string, example: REF-1A2B3C4D }
 *       400:
 *         description: Corps invalide — erreur au format Nitro.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
reclamationsRoutes.post('/reclamations', validateBody(createComplaintSchema), asyncHandler(createComplaint))
