import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireClientRole, requireProviderRole } from '../middleware/auth'
import { getContacts, postContacts, getRequestsReceived } from '../controllers/quotaController'

/**
 * Compteurs d'usage mensuels (#65), portés depuis `server/api/quotas/**`
 * (Phase 2, ADR-0017). Montés sous `/api` → chemins iso Nitro. Contacts réservés
 * au rôle client, demandes reçues au rôle prestataire.
 *
 * NB : le compteur de demandes reçues est alimenté par la création de demandes
 * (`requests`), domaine non encore porté (dépend de l'annuaire/matching) — la
 * route reste iso, mais renvoie 0 tant qu'aucune demande n'est créée côté backend.
 */
export const quotasRoutes = Router()

/**
 * @openapi
 * /quotas/contacts:
 *   get:
 *     tags: [Quotas]
 *     summary: Usage du quota mensuel de contacts (client)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usage courant (count, limit, month).
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { usage: { $ref: '#/components/schemas/QuotaUsage' } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux clients., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
quotasRoutes.get('/quotas/contacts', requireClientRole, getContacts)

/**
 * @openapi
 * /quotas/contacts:
 *   post:
 *     tags: [Quotas]
 *     summary: Incrémente le quota de contacts (clic « Contacter »)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Compteur incrémenté.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { usage: { $ref: '#/components/schemas/QuotaUsage' } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux clients., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Quota mensuel atteint., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
quotasRoutes.post('/quotas/contacts', requireClientRole, postContacts)

/**
 * @openapi
 * /quotas/requests-received:
 *   get:
 *     tags: [Quotas]
 *     summary: Usage du quota mensuel de demandes reçues (prestataire)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usage courant selon la formule (limit `null` = illimité).
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { usage: { $ref: '#/components/schemas/QuotaUsage' } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux prestataires., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
quotasRoutes.get('/quotas/requests-received', requireProviderRole, asyncHandler(getRequestsReceived))
