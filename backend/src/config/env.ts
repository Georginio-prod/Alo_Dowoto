import 'dotenv/config'

/**
 * Configuration issue de l'environnement, lue une seule fois au démarrage.
 * Centralisée ici pour que le reste du code ne touche jamais `process.env`.
 */
export interface AppEnv {
  nodeEnv: string
  port: number
  /** Origines autorisées pour CORS (web, dashboard, mobile). */
  corsOrigins: string[]
  sentryDsn: string | undefined
  isProd: boolean
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const nodeEnv = process.env.NODE_ENV ?? 'development'

export const env: AppEnv = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3001),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  sentryDsn: process.env.SENTRY_DSN || undefined,
  isProd: nodeEnv === 'production',
}
