import { defineConfig, devices } from '@playwright/test'
// Base de test PostgreSQL (schéma `test` isolé de la production), voir tests/setup/testDatabase.ts.
import { TEST_DATABASE_URL, TEST_DIRECT_URL } from './tests/setup/testDatabase'

/**
 * Tests de parcours (end-to-end) du site — voir e2e/.
 *
 * Contrairement aux tests Vitest (tests/**, unitaires + HTTP sur des routes
 * isolées), ceux-ci démarrent une vraie instance Nuxt et pilotent un vrai
 * navigateur : ils valident les parcours complets (inscription, recherche,
 * messagerie…) tels qu'un visiteur les vit.
 *
 * Base de données : le schéma PostgreSQL `test` jetable (Supabase), recréé à
 * chaque exécution par e2e/global-setup.ts (même helper que Vitest) — les tests
 * ne touchent jamais la production (`public`). Voir tests/setup/testDatabase.ts.
 *
 * OTP : `BREVO_API_KEY`/`TWILIO_*` sont volontairement vidés pour l'instance
 * de test, ce qui fait retomber /api/auth/otp/send sur son mode développement
 * (le code est renvoyé dans `devCode`) — l'inscription est donc jouable de
 * bout en bout sans envoyer de vrai SMS ni de vrai email.
 */
const PORT = Number(process.env.E2E_PORT ?? 3101)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`

export const E2E_DATABASE_URL = TEST_DATABASE_URL

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : [['list'], ['html', { open: 'never' }]],
  // Le premier rendu d'une page Nuxt en dev inclut sa compilation à la volée :
  // 30 s (défaut) est trop court sur une machine froide.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      // Coupe les DevTools Nuxt : leur overlay intercepte les clics (voir
      // nuxt.config.ts).
      E2E: 'true',
      DATABASE_URL: E2E_DATABASE_URL,
      DIRECT_URL: TEST_DIRECT_URL,
      // Pas d'envoi réel d'OTP depuis l'instance de test (voir en-tête).
      BREVO_API_KEY: '',
      BREVO_SMS_SENDER: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_FROM: '',
      EMAIL_FROM: '',
    },
  },
})
