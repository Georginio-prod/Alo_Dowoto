import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { env } from './env'
import { swaggerSpec } from './swagger'
import { errorHandler } from '../middleware/errorHandler'
import { notFoundHandler } from '../middleware/notFound'
import { healthRoutes } from '../routes/health.routes'
import { testimonialsRoutes } from '../routes/testimonials.routes'
import { reclamationsRoutes } from '../routes/reclamations.routes'

/**
 * Fabrique l'application Express. La plomberie transverse est posée ici —
 * CORS multi-clients (web/dashboard/mobile), limitation de débit, parsing JSON —
 * puis les routes, et enfin les gestionnaires 404 et d'erreurs.
 *
 * L'ORDRE est significatif : routes → 404 → erreurs. Les routes `/api/**`
 * métier s'insèrent avant le 404, domaine par domaine (Phase 2).
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
  app.use(cookieParser())

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use('/', healthRoutes)

  // Routes métier `/api/**`, portées depuis `server/api/**` domaine par domaine
  // (Phase 2, ADR-0017). Montées sous `/api` → chemins identiques à Nitro, le
  // reverse proxy reste passe-plat. Chaque domaine porté vient s'ajouter ici.
  app.use('/api', testimonialsRoutes)
  app.use('/api', reclamationsRoutes)

  // Doc OpenAPI (hors prod par défaut, cf. env.docsEnabled). Montée sous `/api`
  // pour rester cohérente avec le reverse proxy `/api/* → backend` (ADR-0017) :
  // `/api/docs` (UI) et `/api/docs.json` (spec brute).
  if (env.docsEnabled) {
    app.get('/api/docs.json', (_req, res) => {
      res.json(swaggerSpec)
    })
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
