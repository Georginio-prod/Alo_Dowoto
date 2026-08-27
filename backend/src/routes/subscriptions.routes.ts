import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireProviderRole } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { planSlugSchema } from '../validation/schemas/subscriptions'
import { createSubscription, getMySubscription, startTrial } from '../controllers/subscriptionController'

/**
 * Abonnements prestataire (#281), portés depuis `server/api/subscriptions/*`
 * (Phase 2, ADR-0017). Montés sous `/api` → `/api/subscriptions[...]`, iso Nitro.
 * Réservés au **rôle prestataire** (401 sans session, 403 sinon).
 */
export const subscriptionsRoutes = Router()

/**
 * @openapi
 * /subscriptions:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Souscrire une formule (en attente de paiement)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { plan: { type: string, enum: [mensuel, trimestriel, annuel] } } }
 *     responses:
 *       200: { description: Abonnement en attente., content: { application/json: { schema: { type: object, properties: { subscription: { type: object } } } } } }
 *       400: { description: Formule invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Un abonnement actif existe déjà., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
subscriptionsRoutes.post('/subscriptions', requireProviderRole, validateBody(planSlugSchema), asyncHandler(createSubscription))

/**
 * @openapi
 * /subscriptions/me:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Abonnement du prestataire connecté (ou null)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Abonnement courant ou null., content: { application/json: { schema: { type: object, properties: { subscription: { type: object, nullable: true } } } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
subscriptionsRoutes.get('/subscriptions/me', requireProviderRole, asyncHandler(getMySubscription))

/**
 * @openapi
 * /subscriptions/trial:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Démarrer l'essai gratuit de 14 jours (1re souscription)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { plan: { type: string, enum: [mensuel, trimestriel, annuel] } } }
 *     responses:
 *       201: { description: Essai activé., content: { application/json: { schema: { type: object, properties: { subscription: { type: object } } } } } }
 *       400: { description: Formule invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Essai déjà utilisé., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
subscriptionsRoutes.post('/subscriptions/trial', requireProviderRole, validateBody(planSlugSchema), asyncHandler(startTrial))
