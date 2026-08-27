import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Global setup Vitest : prépare une base PostgreSQL jetable pour les tests des
 * stores branchés sur Prisma. Le schéma est **réinitialisé** (`--force-reset`,
 * drop + recréation) à chaque exécution, ce qui rend les tests reproductibles.
 *
 * Nécessite le conteneur Docker démarré (`docker compose up -d postgres`).
 * L'URL peut être surchargée via `TEST_DATABASE_URL` (utilisé en CI, où un
 * service Postgres fournit la base). Doit rester alignée avec `test.env` de
 * vitest.config.ts.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://worktogo:worktogo@localhost:5433/worktogo_test'

export default function setup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  })
}
