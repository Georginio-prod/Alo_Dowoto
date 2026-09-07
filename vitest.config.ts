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
    autoImport({
      imports: [
        'vue',
        { '~~/tests/setup/useI18nShim': ['useI18n'] },
        { '~/composables/useApi': ['useApi'] },
      ],
      dts: false,
    }),
    vue(),
  ],
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#domain-data': fileURLToPath(new URL('./backend/src/data', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup/i18n.ts'],
  },
})
