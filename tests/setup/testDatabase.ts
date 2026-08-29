import 'dotenv/config'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Base de test PostgreSQL (migration Supabase, S-02).
 *
 * Les tests tournent désormais sur PostgreSQL comme la production — mais dans un
 * SCHÉMA dédié `test`, totalement isolé du schéma `public` où vivent les vraies
 * données. Chaque exécution repart d'un schéma vierge (`DROP SCHEMA test CASCADE`
 * + `CREATE SCHEMA test`), ce qui rend les tests reproductibles SANS jamais
 * toucher la production. Un garde-fou refuse toute URL qui ne cible pas `test`.
 *
 * Aucune base séparée à provisionner : on réutilise les connexions Supabase de
 * `.env` (DATABASE_URL = pooler 6543 ; DIRECT_URL = direct 5432) en y forçant le
 * schéma `test`.
 */
export const TEST_SCHEMA = 'test'

/** Force le schéma `test` sur une URL PostgreSQL et vérifie qu'on ne vise jamais la production. */
function withTestSchema(rawUrl: string | undefined, varName: string, extra: Record<string, string> = {}): string {
  if (!rawUrl || !rawUrl.startsWith('postgres')) {
    throw new Error(
      `[tests] ${varName} absente ou non-PostgreSQL. La suite de tests requiert une base PostgreSQL `
      + `(voir .env : DATABASE_URL + DIRECT_URL Supabase). Migration S-02.`,
    )
  }
  const url = new URL(rawUrl)
  url.searchParams.set('schema', TEST_SCHEMA)
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)
  // Garde-fou dur : jamais le schéma de production `public`.
  if (url.searchParams.get('schema') !== TEST_SCHEMA) {
    throw new Error('[tests] REFUS : le schéma de test doit être `test`, jamais la production.')
  }
  return url.toString()
}

/**
 * Deux chemins possibles pour la base de test :
 *
 *  1. RAPIDE (recommandé) — un PostgreSQL LOCAL. Poser `TEST_DATABASE_URL` (et
 *     `TEST_DIRECT_URL`) dans `.env` vers ce serveur local (ex. le Postgres
 *     Docker de `docker-compose.test.yml`, `npm run db:test:up`). Aucune latence
 *     réseau : la suite complète tourne vite.
 *  2. ZÉRO INSTALLATION (repli) — le schéma `test` de la base Supabase de `.env`.
 *     Fonctionne sans rien installer, mais chaque requête paie un aller-retour
 *     réseau : bien pour quelques tests, lent pour la suite entière.
 *
 * Dans les deux cas on force le schéma `test` (jamais `public`).
 */
const LOCAL_APP = process.env.TEST_DATABASE_URL
const LOCAL_DIRECT = process.env.TEST_DIRECT_URL

/** URL applicative des tests (schéma `test`) — injectée aux workers via test.env. */
export const TEST_DATABASE_URL = withTestSchema(LOCAL_APP ?? process.env.DATABASE_URL, 'DATABASE_URL', { connection_limit: '1' })

/** URL directe des tests (schéma `test`) — pour les DDL (db execute / db push). */
export const TEST_DIRECT_URL = withTestSchema(LOCAL_DIRECT ?? LOCAL_APP ?? process.env.DIRECT_URL, 'DIRECT_URL')

/**
 * Remet à zéro le schéma `test` puis y (re)crée toutes les tables. À appeler
 * depuis le global setup de Vitest et de Playwright.
 */
export function resetAndPushTestSchema(): void {
  const cwd = fileURLToPath(new URL('../..', import.meta.url))
  // 1. Repartir d'un schéma `test` vierge. DROP CASCADE ne touche QUE ce schéma.
  execSync(`npx prisma db execute --url "${TEST_DIRECT_URL}" --stdin`, {
    cwd,
    input: 'DROP SCHEMA IF EXISTS "test" CASCADE; CREATE SCHEMA "test";',
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  // 2. Créer les tables dans le schéma `test` via la connexion directe. On force
  //    DIRECT_URL ET DATABASE_URL sur l'URL de test pour que prisma.config.ts
  //    (qui lit DIRECT_URL) et le schéma (qui lit DATABASE_URL) visent tous deux
  //    le schéma `test`, jamais la production.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd,
    env: { ...process.env, DATABASE_URL: TEST_DIRECT_URL, DIRECT_URL: TEST_DIRECT_URL },
    stdio: 'inherit',
  })
}
