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
  /** Expose la doc OpenAPI (`/api/docs`). Par défaut : activée hors production. */
  docsEnabled: boolean
  /**
   * Relais de mises à jour du dashboard desktop (#Electron auto-update) : jeton
   * GitHub lecture seule et dépôt privé des releases. Noms d'env conservés
   * depuis Nitro (`NUXT_GITHUB_UPDATE_*`) pour une migration sans reconfiguration,
   * avec repli sur les noms non préfixés.
   */
  githubUpdateToken: string
  githubUpdateRepo: string
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback
  return raw === '1' || raw.toLowerCase() === 'true'
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
  docsEnabled: parseBool(process.env.API_DOCS_ENABLED, nodeEnv !== 'production'),
  githubUpdateToken: process.env.NUXT_GITHUB_UPDATE_TOKEN ?? process.env.GITHUB_UPDATE_TOKEN ?? '',
  githubUpdateRepo:
    process.env.NUXT_GITHUB_UPDATE_REPO ?? process.env.GITHUB_UPDATE_REPO ?? 'Nova2026-graphik/worktogo-admin',
}
