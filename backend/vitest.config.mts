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
    },
  },
})
