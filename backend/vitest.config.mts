import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Tous les fichiers manipulent la même base PostgreSQL isolée. Les exécuter
    // en parallèle rend les nettoyages concurrents et crée des faux échecs.
    maxWorkers: 1,
    fileParallelism: false,
    // Base de test ISOLÉE, préparée par le globalSetup — jamais la base
    // partagée `worktogo` (propriété de l'app). Surchargeable via
    // TEST_DATABASE_URL en CI ; doit rester alignée avec vitest.globalSetup.ts.
    globalSetup: ['./vitest.globalSetup.ts'],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://worktogo:worktogo@localhost:5433/worktogo_backend_test',
      // Le parcours d'abonnement est masqué en production pour le moment ; on
      // le réactive ici pour que les tests de quotas/abonnements continuent de
      // le couvrir (le cas « flag désactivé » est testé via vi.resetModules).
      SUBSCRIPTION_ENABLED: 'true',
      // Aucun provider SMS/email pendant les tests, même si `backend/.env` en
      // configure un : les contrats OTP s'appuient sur `devCode` et aucun test
      // ne doit envoyer un vrai message. `dotenv` n'écrase pas une variable déjà
      // présente (même vide), ces valeurs priment donc sur le `.env` local.
      BREVO_API_KEY: '',
      BREVO_SMS_SENDER: '',
      EMAIL_FROM: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_FROM: '',
    },
  },
})
