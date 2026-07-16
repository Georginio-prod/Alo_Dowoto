import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Global setup Vitest (#218) : crée une base SQLite jetable pour les tests
 * des stores branchés sur Prisma (userStore, otpStore, loginFlow). Le
 * fichier est supprimé puis recréé à chaque exécution, ce qui rend les
 * tests reproductibles. L'URL est injectée dans les workers via `test.env`
 * (voir vitest.config.ts) — les deux doivent rester alignées.
 */
const TEST_DB_PATH = fileURLToPath(new URL('./test.db', import.meta.url))
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`

export default function setup() {
  rmSync(TEST_DB_PATH, { force: true })
  execSync('npx prisma db push --skip-generate', {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  })
}
