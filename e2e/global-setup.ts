import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Prépare une base PostgreSQL jetable pour les tests de parcours — même
 * principe que tests/setup/prismaTestDb.ts côté Vitest. `db push` (sans
 * `--force-reset`) synchronise le schéma sans détruire de données : les tests
 * ne supposent jamais une base vide (chaque compte créé a un contact unique).
 *
 * L'URL est injectée dans l'instance Nuxt via `webServer.env`
 * (playwright.config.ts) — les deux doivent rester alignées. Nécessite le
 * conteneur Docker démarré (`docker compose up -d postgres`) ; surchargeable
 * via `E2E_DATABASE_URL` (utilisé en CI).
 */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://worktogo:worktogo@localhost:5433/worktogo_e2e'

export default function globalSetup() {
  execSync('npx prisma db push --schema backend/prisma/schema.prisma --skip-generate', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  })
}
