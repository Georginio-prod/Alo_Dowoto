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
import { updatesRoutes } from '../routes/updates.routes'
import { authRoutes } from '../routes/auth.routes'
import { testimonialsRoutes } from '../routes/testimonials.routes'
import { reclamationsRoutes } from '../routes/reclamations.routes'
import { favoritesRoutes } from '../routes/favorites.routes'
import { notificationsRoutes } from '../routes/notifications.routes'
import { referralsRoutes } from '../routes/referrals.routes'
import { subscriptionsRoutes } from '../routes/subscriptions.routes'
import { providersRoutes } from '../routes/providers.routes'
import { reviewsRoutes } from '../routes/reviews.routes'
import { verificationRoutes } from '../routes/verification.routes'
import { walletRoutes } from '../routes/wallet.routes'
import { accountRoutes } from '../routes/account.routes'
import { paymentsRoutes } from '../routes/payments.routes'
import { quotasRoutes } from '../routes/quotas.routes'
import { requestsRoutes } from '../routes/requests.routes'
import { assistantRoutes } from '../routes/assistant.routes'
import { sectorsRoutes } from '../routes/sectors.routes'

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

  // `verify` conserve le corps brut sur `req.rawBody` : les webhooks opérateur
  // (#34/#193) signent le texte exact reçu, qu'il faut vérifier AVANT toute
  // re-sérialisation. Les routes `**/webhook` ne passent PAS par le parseur JSON
  // (qui rejetterait un JSON malformé avant le handler) : elles reçoivent le
  // corps brut et le parsent elles-mêmes, pour renvoyer le 400 « Corps webhook
  // illisible » iso Nitro. Les deux parseurs stockent `req.rawBody`.
  const captureRaw = (req: express.Request, _res: express.Response, buf: Buffer) => {
    req.rawBody = buf
  }
  const jsonParser = express.json({ limit: '1mb', verify: captureRaw })
  const rawParser = express.raw({ type: '*/*', limit: '1mb', verify: captureRaw })
  app.use((req, res, next) => (req.path.endsWith('/webhook') ? rawParser : jsonParser)(req, res, next))
  app.use(cookieParser())

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      // Le relais de mises à jour Electron (#auto-update) est exempté : un
      // téléchargement différentiel émet de nombreuses requêtes `Range`
      // rapprochées qui dépasseraient la fenêtre. Iso Nitro (aucune limite là-bas).
      skip: (req) => req.path.startsWith('/api/updates/'),
    }),
  )

  app.use('/', healthRoutes)
  // Monté tôt et hors métier : relais public sans session ni corps JSON.
  app.use('/api', updatesRoutes)

  // Routes métier `/api/**`, portées depuis `server/api/**` domaine par domaine
  // (Phase 2, ADR-0017). Montées sous `/api` → chemins identiques à Nitro, le
  // reverse proxy reste passe-plat. Chaque domaine porté vient s'ajouter ici.
  app.use('/api', authRoutes)
  app.use('/api', testimonialsRoutes)
  app.use('/api', reclamationsRoutes)
  app.use('/api', favoritesRoutes)
  app.use('/api', notificationsRoutes)
  app.use('/api', referralsRoutes)
  app.use('/api', subscriptionsRoutes)
  app.use('/api', providersRoutes)
  app.use('/api', reviewsRoutes)
  app.use('/api', verificationRoutes)
  app.use('/api', walletRoutes)
  app.use('/api', accountRoutes)
  app.use('/api', paymentsRoutes)
  app.use('/api', quotasRoutes)
  app.use('/api', requestsRoutes)
  app.use('/api', assistantRoutes)
  app.use('/api', sectorsRoutes)

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
