import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  // Désactivé pour l'instance lancée par les tests de parcours (E2E=true, voir
  // playwright.config.ts) : l'overlay des DevTools se superpose à la page et
  // intercepte les clics, ce qui fait échouer des tests sans rapport.
  devtools: { enabled: process.env.E2E !== 'true' },
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
    // Adresse publique du site, nécessaire pour que les balises SEO générées
    // par useLocaleHead() (canonical, hreflang) soient absolues — sans elle,
    // Nuxt journalise « I18n baseUrl is required to generate valid SEO tag
    // links » à chaque rendu. Laissée vide hors production faute de domaine
    // configuré : voir NUXT_PUBLIC_SITE_URL dans .env.example.
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL ?? '',
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
    // Relais de mises à jour du dashboard admin desktop (voir
    // server/api/updates/[...file].get.ts). Le jeton GitHub (lecture seule sur
    // le dépôt PRIVÉ des releases) vit UNIQUEMENT ici, côté serveur : il n'est
    // jamais embarqué sur les postes clients. À définir via l'environnement :
    //   NUXT_GITHUB_UPDATE_TOKEN=github_pat_… (Contents: Read-only)
    //   NUXT_GITHUB_UPDATE_REPO=Nova2026-graphik/worktogo-admin (facultatif)
    githubUpdateToken: '',
    githubUpdateRepo: 'Nova2026-graphik/worktogo-admin',
    public: {
      sentryDsn: '',
      // Point de bascule vers le backend Express (chantier d'extraction, ADR-0014).
      // Les deux sont VIDES par défaut → l'API interne Nitro est utilisée, aucun
      // changement de comportement. La bascule d'un domaine se fait sans redéploiement
      // de code, par simple configuration (réversible instantanément) :
      //   NUXT_PUBLIC_BACKEND_BASE_URL=https://api.worktogo.example   (URL du backend)
      //   NUXT_PUBLIC_MIGRATED_API_PREFIXES=/api/auth,/api/wallet     (domaines déjà portés, CSV)
      backendBaseUrl: '',
      migratedApiPrefixes: ''
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
          // Autorisé par la CSP (#354) via un nonce par requête, injecté par
          // server/plugins/cspNonce.ts (ce script n'a aucun moyen de le
          // connaître au moment où Nuxt construit cette configuration statique).
          innerHTML: ";(function(){try{var t=localStorage.getItem('wt-theme');if(t&&t!=='clair'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();",
          tagPosition: 'head'
        }
      ]
    }
  },
  vite: {
    plugins: [tailwindcss()],
    // Le serveur de dev Vite refuse par défaut les requêtes dont l'en-tête Host
    // n'est pas local (protection anti-DNS-rebinding). Quand le backend est
    // exposé via un tunnel ngrok (dashboard admin + APK sur d'autres machines),
    // il faut autoriser explicitement le domaine du tunnel. N'affecte QUE le
    // serveur de dev ; le build de production (nuxt build) n'a pas ce contrôle.
    server: {
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app']
    }
  }
})
