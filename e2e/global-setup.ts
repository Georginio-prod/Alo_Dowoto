import { resetAndPushTestSchema } from '../tests/setup/testDatabase'

/**
 * Prépare le schéma PostgreSQL `test` jetable pour les tests de parcours — même
 * principe et même helper que côté Vitest (tests/setup/testDatabase.ts, S-02) :
 * le schéma `test` est remis à zéro puis recréé, ce qui rend les tests
 * reproductibles et garantit que la production (`public`) n'est jamais touchée.
 *
 * L'URL de test est injectée dans l'instance Nuxt via `webServer.env`
 * (playwright.config.ts) — les deux doivent rester alignées.
 */
export default function globalSetup() {
  resetAndPushTestSchema()
}
