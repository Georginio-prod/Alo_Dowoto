import { computed } from 'vue'
import { useI18n as useVueI18n } from 'vue-i18n'

/**
 * Réplique l'augmentation apportée par @nuxtjs/i18n à `useI18n()` (#i18n) :
 * en production, le module Nuxt enrichit le composer vue-i18n natif avec
 * `locales` (la liste des locales configurées dans nuxt.config.ts, avec leur
 * tag BCP-47 `language`) — c'est ce que les composants utilisent pour le
 * formatage de dates/heures localisé (ex. ConversationList.vue, voir
 * `locales.value.find(...)`). Vitest ne charge que vue-i18n brut (voir
 * tests/setup/i18n.ts), qui n'expose pas `locales` : sans ce shim, tout
 * composant appelant ce pattern échoue avec `Cannot read properties of
 * undefined (reading 'value')` dès qu'un test le monte réellement.
 */
const LOCALES = [
  { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
  { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
]

export function useI18n(options?: Parameters<typeof useVueI18n>[0]) {
  const composer = useVueI18n(options)
  return {
    ...composer,
    locales: computed(() => LOCALES),
  }
}
