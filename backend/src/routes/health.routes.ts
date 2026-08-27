import { Router } from 'express'
import { prisma } from '../config/prisma'

/**
 * Sondes de disponibilité. `/health` (liveness) ne dépend de rien ; `/health/db`
 * (readiness) vérifie la connexion à PostgreSQL. Les routes métier seront
 * montées domaine par domaine (Phase 3), portées depuis `server/api/**` et
 * validées iso par les tests de contrat (`tests/contract`, ADR-0016).
 */
export const healthRoutes = Router()

healthRoutes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'alo-dowoto-backend',
    timestamp: new Date().toISOString(),
  })
})

healthRoutes.get('/health/db', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'postgres' })
  } catch (error) {
    next(error)
  }
})
