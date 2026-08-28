import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireClientRole } from '../middleware/auth'
import { validateBody } from '../validation/validate'
import { addFavoriteSchema } from '../validation/schemas/favorites'
import { createFavorite, deleteFavorite } from '../controllers/favoriteController'

/**
 * Favoris client → prestataire (#65), portés depuis `server/api/favorites/*`
 * (Phase 2, ADR-0017). Monté sous `/api` → `/api/favorites`, iso Nitro.
 *
 * Toutes réservées au **rôle client** (`requireClientRole` : 401 sans session,
 * 403 si mauvais rôle — mêmes codes/messages que Nitro). **GET /api/favorites
 * est différé** (enrichissement via l'annuaire prestataires non encore porté).
 */
export const favoritesRoutes = Router()

/**
 * @openapi
 * /favorites:
 *   post:
 *     tags: [Favorites]
 *     summary: Ajouter un prestataire aux favoris (client)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerId]
 *             properties:
 *               providerId: { type: string }
 *     responses:
 *       201:
 *         description: Favori ajouté (idempotent).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favorite:
 *                   type: object
 *                   properties:
 *                     clientId: { type: string }
 *                     providerId: { type: string }
 *                     createdAt: { type: integer, description: Horodatage ms (epoch). }
 *       400: { description: Corps invalide., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes client., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
favoritesRoutes.post('/favorites', requireClientRole, validateBody(addFavoriteSchema), asyncHandler(createFavorite))

/**
 * @openapi
 * /favorites/{providerId}:
 *   delete:
 *     tags: [Favorites]
 *     summary: Retirer un prestataire des favoris (client)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Favori retiré (idempotent).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Réservé aux comptes client., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
favoritesRoutes.delete('/favorites/:providerId', requireClientRole, asyncHandler(deleteFavorite))
