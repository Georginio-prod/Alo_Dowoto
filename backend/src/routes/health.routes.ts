import { Router } from 'express'
import { prisma } from '../config/prisma'

/**
 * Sondes de disponibilité. `/health` (liveness) ne dépend de rien ; `/health/db`
 * (readiness) vérifie la connexion à PostgreSQL. Les routes métier seront
 * montées domaine par domaine (Phase 3), portées depuis `server/api/**` et
 * validées iso par les tests de contrat (`tests/contract`, ADR-0016).
 */
export const healthRoutes = Router()

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Sonde de disponibilité (liveness)
 *     description: Ne dépend d'aucune ressource externe. Sert de gabarit d'annotation pour les routes portées en Phase 2.
 *     responses:
 *       200:
 *         description: Le service répond.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 service: { type: string, example: alo-dowoto-backend }
 *                 timestamp: { type: string, format: date-time }
 */
healthRoutes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'alo-dowoto-backend',
    timestamp: new Date().toISOString(),
  })
})

/**
 * @openapi
 * /health/db:
 *   get:
 *     tags: [Health]
 *     summary: Sonde de préparation (readiness)
 *     description: Vérifie la connexion à PostgreSQL par un `SELECT 1`.
 *     responses:
 *       200:
 *         description: Base joignable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 database: { type: string, example: postgres }
 *       500:
 *         description: Base injoignable — erreur au format Nitro.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
healthRoutes.get('/health/db', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'postgres' })
  } catch (error) {
    next(error)
  }
})
