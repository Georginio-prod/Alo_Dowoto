import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireProviderRole } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { addAvailabilitySchema, patchProviderSchema } from '../validation/schemas/providers'
import { addAvailability, deleteAvailability, listAvailability } from '../controllers/availabilityController'
import { deleteMyPosition, getMyProfile, patchMyProfile } from '../controllers/providerController'

/**
 * Domaine « prestataires » (#290 pour la partie disponibilité), porté depuis
 * `server/api/providers/*` (Phase 2, ADR-0017). Monté sous `/api` → `/api/providers/*`,
 * iso Nitro.
 *
 * Portées ici : le **profil `me`** (fiche prestataire) et le **calendrier de
 * disponibilité** (rôle prestataire). Restent à porter : la découverte publique
 * (`search`, `[id]`, `featured`), qui embarque l'annuaire complet.
 */
export const providersRoutes = Router()

/**
 * @openapi
 * /providers/me:
 *   get:
 *     tags: [Providers]
 *     summary: Fiche du prestataire connecté (ou null)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Profil courant ou null., content: { application/json: { schema: { type: object, properties: { profile: { type: object, nullable: true } } } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     tags: [Providers]
 *     summary: Mettre à jour la fiche prestataire (#356)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object } } }
 *     responses:
 *       200: { description: Profil mis à jour., content: { application/json: { schema: { type: object, properties: { profile: { type: object } } } } } }
 *       400: { description: Corps invalide / onboarding incomplet., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
providersRoutes.get('/providers/me', requireProviderRole, asyncHandler(getMyProfile))
providersRoutes.patch('/providers/me', requireProviderRole, validateBody(patchProviderSchema), asyncHandler(patchMyProfile))

/**
 * @openapi
 * /providers/me/position:
 *   delete:
 *     tags: [Providers]
 *     summary: Supprimer la position GPS précise du prestataire (#geoloc)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Position supprimée., content: { application/json: { schema: { type: object, properties: { profile: { type: object } } } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Profil prestataire introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
providersRoutes.delete('/providers/me/position', requireProviderRole, asyncHandler(deleteMyPosition))

/**
 * @openapi
 * /providers/availability:
 *   get:
 *     tags: [Providers]
 *     summary: Périodes d'indisponibilité du prestataire connecté (#290)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des périodes., content: { application/json: { schema: { type: object, properties: { periods: { type: array, items: { type: object } } } } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   post:
 *     tags: [Providers]
 *     summary: Déclarer une période d'indisponibilité (#290)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate, endDate]
 *             properties:
 *               startDate: { type: string, example: "2026-08-01" }
 *               endDate: { type: string, example: "2026-08-05" }
 *     responses:
 *       201: { description: Période créée., content: { application/json: { schema: { type: object, properties: { period: { type: object } } } } } }
 *       400: { description: Dates invalides., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
providersRoutes.get('/providers/availability', requireProviderRole, asyncHandler(listAvailability))
providersRoutes.post('/providers/availability', requireProviderRole, validateBody(addAvailabilitySchema), asyncHandler(addAvailability))

/**
 * @openapi
 * /providers/availability/{id}:
 *   delete:
 *     tags: [Providers]
 *     summary: Supprimer une période d'indisponibilité (#290)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Période supprimée., content: { application/json: { schema: { type: object, properties: { ok: { type: boolean, example: true } } } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes prestataire., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Période introuvable., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
providersRoutes.delete('/providers/availability/:id', requireProviderRole, asyncHandler(deleteAvailability))
