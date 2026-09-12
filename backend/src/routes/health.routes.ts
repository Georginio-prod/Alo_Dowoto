import { Router } from 'express'
import { prisma } from '../config/prisma'
import { asyncHandler } from '../utils/asyncHandler'
import { deliveryStatus } from '../utils/deliveryStatus'

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
healthRoutes.get('/health/db', asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok', database: 'postgres' })
}))

/**
 * @openapi
 * /health/delivery:
 *   get:
 *     tags: [Health]
 *     summary: Canaux d'envoi OTP/notifications configurés
 *     description: Indique le driver actif pour l'email et le SMS (`null` = aucun provider → repli `devCode` hors production, 503 en production). Aucun secret exposé, seulement le nom du driver.
 *     responses:
 *       200:
 *         description: État des deux canaux.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 email: { type: string, nullable: true, enum: [brevo], example: brevo }
 *                 sms: { type: string, nullable: true, enum: [brevo, twilio], example: null }
 */
healthRoutes.get('/health/delivery', (_req, res) => {
  res.json({ status: 'ok', ...deliveryStatus() })
})
