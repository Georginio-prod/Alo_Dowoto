import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { getSectorCounts } from '../controllers/sectorController'

/**
 * Secteurs (#66), porté depuis `server/api/sectors/**` (Phase 2, ADR-0017).
 * Monté sous `/api` → `/api/sectors/counts`, iso Nitro. Route publique.
 */
export const sectorsRoutes = Router()

/**
 * @openapi
 * /sectors/counts:
 *   get:
 *     tags: [Sectors]
 *     summary: Nombre de prestataires par secteur (grille des catégories)
 *     responses:
 *       200:
 *         description: Liste { slug, count } par secteur.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   slug: { type: string }
 *                   count: { type: integer }
 */
sectorsRoutes.get('/sectors/counts', asyncHandler(getSectorCounts))
