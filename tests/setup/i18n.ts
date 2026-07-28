import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/en.json'
import fr from '../../i18n/locales/fr.json'

// Réplique le module @nuxtjs/i18n pour les composants testés ici (#i18n) :
// sans ce plugin global, tout composant appelant `useI18n()` échouerait au
// montage avec `ReferenceError: useI18n is not defined` (Nuxt l'auto-importe
// en production, mais Vitest ne connaît que les auto-imports déclarés dans
// vitest.config.ts).
const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages: { fr, en },
})

config.global.plugins.push(i18n)
