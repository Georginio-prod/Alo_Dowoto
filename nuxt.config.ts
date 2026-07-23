import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  devtools: { enabled: true },
  css: [
    // Police Poppins auto-hébergée (@fontsource) plutôt que servie depuis le
    // CDN Google — voir #341 : évite de transmettre l'IP des visiteurs à
    // Google (conformité loi togolaise 2019-014) et supprime une connexion
    // tierce bloquante. Les fichiers .woff2 sont packagés localement.
    // Sous-ensembles latin + latin-ext uniquement (couvrent le français, y
    // compris œ / caractères accentués) — on n'embarque pas le devanagari.
    '@fontsource/poppins/latin-400.css',
    '@fontsource/poppins/latin-500.css',
    '@fontsource/poppins/latin-600.css',
    '@fontsource/poppins/latin-700.css',
    '@fontsource/poppins/latin-800.css',
    '@fontsource/poppins/latin-ext-400.css',
    '@fontsource/poppins/latin-ext-500.css',
    '@fontsource/poppins/latin-ext-600.css',
    '@fontsource/poppins/latin-ext-700.css',
    '@fontsource/poppins/latin-ext-800.css',
    '~/assets/css/main.css',
    '~/assets/css/themes.css',
  ],
  eslint: {
    config: {
      typescript: {
        strict: true
      }
    }
  },
  // FR par défaut, EN en second (#364). `<html lang>` est géré dynamiquement
  // via useLocaleHead() dans app.vue (remplace le `lang="fr"` figé de #343) :
  // pas de préfixe d'URL (`no_prefix`) pour ne pas casser les routes déjà
  // référencées (sitemap, liens internes, #358).
  i18n: {
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
    ],
    strategy: 'no_prefix',
    detectBrowserLanguage: false
  },
  typescript: {
    strict: true,
    typeCheck: true
  },
  // Instrumentation d'erreurs (#262) : DSN public exposé au client, lu depuis
  // NUXT_PUBLIC_SENTRY_DSN. Vide par défaut (voir app/plugins/errorReporting.client.ts,
  // qui reste inerte tant qu'aucune valeur n'est fournie).
  runtimeConfig: {
    public: {
      sentryDsn: ''
    }
  },
  app: {
    // Transition globale entre les pages (voir .page-* dans main.css).
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      // `htmlAttrs.lang` n'est plus figé ici (#343) : géré dynamiquement par
      // useLocaleHead() dans app.vue selon la langue active (#364).
      // La police Poppins est désormais auto-hébergée (voir la liste `css`
      // ci-dessus, #341) : plus aucun `link` vers fonts.googleapis.com /
      // fonts.gstatic.com ni `preconnect` associé.
      script: [
        {
          // Applique le thème enregistré avant le premier rendu (évite le flash).
          innerHTML: ";(function(){try{var t=localStorage.getItem('wt-theme');if(t&&t!=='clair'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();",
          tagPosition: 'head'
        }
      ]
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
