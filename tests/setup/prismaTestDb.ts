import { resetAndPushTestSchema, TEST_DATABASE_URL } from './testDatabase'

/**
 * Global setup Vitest : prépare le schéma `test` PostgreSQL jetable pour les
 * stores branchés sur Prisma (userStore, otpStore, loginFlow, escrow…). Le
 * schéma est remis à zéro puis recréé à chaque exécution — reproductible et
 * sans jamais toucher la production (voir tests/setup/testDatabase.ts, S-02).
 * L'URL est injectée dans les workers via `test.env` (voir vitest.config.ts).
 */
export { TEST_DATABASE_URL }

export default function setup() {
  resetAndPushTestSchema()
}
