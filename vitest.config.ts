import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import autoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Réplique les auto-imports de Vue fournis par Nuxt (ref, computed…) pour
    // que les composants testés ici n'aient pas besoin d'imports explicites.
    autoImport({ imports: ['vue'], dts: false }),
    vue(),
  ],
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    // Base SQLite jetable pour les stores branchés sur Prisma (#218) — créée
    // par le globalSetup, URL partagée avec les workers via `env`.
    globalSetup: ['tests/setup/prismaTestDb.ts'],
    env: {
      DATABASE_URL: `file:${fileURLToPath(new URL('./tests/setup/test.db', import.meta.url))}`,
    },
  },
})
