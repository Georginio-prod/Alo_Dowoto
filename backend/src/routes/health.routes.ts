import { Router } from 'express'

/**
 * Sonde de disponibilité — seule route du squelette (Phase 1). Les routes
 * métier seront montées ici domaine par domaine (Phase 3), portées depuis
 * `server/api/**` et validées iso-fonctionnellement par les tests de contrat
 * (`tests/contract`, ADR-0016).
 */
export const healthRoutes = Router()

healthRoutes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'alo-dowoto-backend',
    timestamp: new Date().toISOString(),
  })
})
