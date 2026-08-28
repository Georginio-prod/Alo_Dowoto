import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser, requireClientRole, requireProviderRole } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { createServiceRequestSchema } from '../validation/schemas/requests'
import {
  postRequest,
  getMyRequests,
  getRequest,
  getRequestMatches,
  getReceivedRequests,
} from '../controllers/requestController'

/**
 * Demandes de service et correspondances (#43/#56/#63/#64), portées depuis
 * `server/api/requests/**` (Phase 2, ADR-0017). Montées sous `/api` → chemins
 * iso Nitro. L'ORDRE compte : `/requests/received` et `/requests/:id/matches`
 * sont déclarées avant `/requests/:id` pour ne pas être capturées par `:id`.
 */
export const requestsRoutes = Router()

/**
 * @openapi
 * /requests:
 *   post:
 *     tags: [Requests]
 *     summary: Publier une demande de service (client vérifié)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, skills, budgetMax, urgency, location]
 *             properties:
 *               title: { type: string }
 *               skills: { type: array, items: { type: string } }
 *               description: { type: string }
 *               budgetMax: { type: integer }
 *               urgency: { type: string, enum: [immediate, semaine, flexible] }
 *               location: { type: string }
 *               sector: { type: string }
 *     responses:
 *       201: { description: Demande créée avec son top de correspondances figé. }
 *       400: { description: Corps invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux clients vérifiés., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
requestsRoutes.post('/requests', requireSessionUser, validateBody(createServiceRequestSchema), asyncHandler(postRequest))

/**
 * @openapi
 * /requests:
 *   get:
 *     tags: [Requests]
 *     summary: Demandes du client connecté (« Mon espace »)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des demandes du client. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux clients., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
requestsRoutes.get('/requests', requireClientRole, getMyRequests)

/**
 * @openapi
 * /requests/received:
 *   get:
 *     tags: [Requests]
 *     summary: Demandes matchées reçues par le prestataire connecté
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Demandes où le prestataire figure dans le top. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux prestataires., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
requestsRoutes.get('/requests/received', requireProviderRole, getReceivedRequests)

/**
 * @openapi
 * /requests/{id}/matches:
 *   get:
 *     tags: [Requests]
 *     summary: Recalcule le top de correspondances d'une demande (à la demande)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 20 }
 *     responses:
 *       200: { description: Top de correspondances recalculé. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Demande introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
requestsRoutes.get('/requests/:id/matches', requireSessionUser, asyncHandler(getRequestMatches))

/**
 * @openapi
 * /requests/{id}:
 *   get:
 *     tags: [Requests]
 *     summary: Détail d'une demande + top figé (titulaire uniquement)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Demande et top de correspondances figé. }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Demande introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
requestsRoutes.get('/requests/:id', requireSessionUser, getRequest)
