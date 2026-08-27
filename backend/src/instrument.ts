import * as Sentry from '@sentry/node'
import { env } from './config/env'

/**
 * Instrumentation Sentry — à importer en TOUT PREMIER dans `index.ts`, avant
 * Express, pour que l'auto-instrumentation capture l'ensemble des requêtes.
 * Désactivée tant que `SENTRY_DSN` est absent (cas du développement).
 */
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
  })
}
