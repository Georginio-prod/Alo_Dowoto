import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import autoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Réplique les auto-imports de Vue fournis par Nuxt (ref, computed…) pour
    // que les composants testés ici n'aient pas besoin d'imports explicites.
    // `useI18n` vient de tests/setup/useI18nShim.ts (pas directement de
    // vue-i18n) : ce shim réplique l'augmentation `locales` apportée par
    // @nuxtjs/i18n en production, sans laquelle le formatage de date localisé
    // (ex. ConversationList.vue) plante sous Vitest — voir tests/setup/i18n.ts
    // pour le plugin qui fournit le contexte global vue-i18n lui-même.
    autoImport({ imports: ['vue', { '~~/tests/setup/useI18nShim': ['useI18n'] }], dts: false }),
    // Réplique l'auto-import Nitro pour les fichiers server/api/** (#261) :
    // ces handlers n'ont eux-mêmes aucun import (Nitro les injecte au
    // build) — sans ce plugin, les charger tels quels sous Vitest échouerait
    // avec des ReferenceError sur `requireSessionUser`, `getRouterParam`,
    // `notFound`, etc. `dirs` couvre les helpers de server/utils/** (mêmes
    // noms qu'en production) ; `imports` couvre les primitives h3 que Nitro
    // réexpose globalement. Basé sur `unimport`, la même librairie que Nuxt
    // utilise en interne pour son propre auto-import.
    autoImport({
      dirs: ['server/utils'],
      imports: [
        {
          h3: [
            'defineEventHandler', 'getRouterParam', 'getRouterParams', 'readBody', 'readRawBody',
            'getQuery', 'getCookie', 'setCookie', 'deleteCookie', 'setResponseStatus', 'createError',
            'getHeader', 'getRequestURL', 'sendRedirect', 'setResponseHeader', 'setResponseHeaders',
          ],
          // server/plugins/**, même logique que server/api/** ci-dessus (#354).
          // `nitropack/runtime/plugin` plutôt que le barrel `nitropack/runtime` :
          // ce dernier réexporte des modules à imports virtuels (ex. storage),
          // introuvables hors d'une vraie build Nitro.
          'nitropack/runtime/plugin': ['defineNitroPlugin'],
        },
      ],
      dts: false,
    }),
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
    setupFiles: ['tests/setup/i18n.ts'],
    env: {
      DATABASE_URL: `file:${fileURLToPath(new URL('./tests/setup/test.db', import.meta.url))}`,
      // Les tests des prestataires ont été écrits pour le store en mémoire :
      // on les exécute en mode `memory` (les upserts alimentent la Map, la
      // persistance base est best-effort). La prod tourne en `db` par défaut.
      NUXT_PROVIDERS_SOURCE: 'memory',
      // Les tests d'annuaire s'appuient sur les fiches de démonstration.
      NUXT_PROVIDERS_DEMO: 'on',
    },
  },
})
