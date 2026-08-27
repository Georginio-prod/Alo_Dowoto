import cors from 'cors'
import express, { type Express } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from './env'
import { errorHandler } from '../middleware/errorHandler'
import { notFoundHandler } from '../middleware/notFound'
import { healthRoutes } from '../routes/health.routes'

/**
 * Fabrique l'application Express. La plomberie transverse est posée ici —
 * CORS multi-clients (web/dashboard/mobile), limitation de débit, parsing JSON —
 * puis les routes, et enfin les gestionnaires 404 et d'erreurs.
 *
 * L'ORDRE est significatif : routes → 404 → erreurs. Les routes `/api/**`
 * métier viendront s'insérer avant le 404, domaine par domaine (Phase 3).
 *
 * `createServer` ne démarre pas l'écoute (c'est le rôle de `index.ts`) : cela
 * permet de l'instancier en test (supertest) sans ouvrir de port.
 */
export function createServer(): Express {
  const app = express()

  app.disable('x-powered-by')

  app.use(
    cors({
      // Vide en dev = toutes origines ; en prod, liste blanche via CORS_ORIGINS.
      origin: env.corsOrigins.length ? env.corsOrigins : true,
      credentials: true,
    }),
  )

  app.use(express.json({ limit: '1mb' }))

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use('/', healthRoutes)
  // ↑ Les routes /api/** métier seront montées ici (Phase 3).

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
