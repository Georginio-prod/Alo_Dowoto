import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Le runtime web ne sert plus d'API : Nuxt produit une SPA statique, servie
  // par nginx. Toutes les requêtes `/api/**` sont relayées à Express.
  ssr: false,
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  // Référentiel unique partagé avec Express (secteurs, régions et rayons de
  // recherche) : le front ne maintient plus de copie concurrente de ces données.
  alias: {
    '#domain-data': fileURLToPath(new URL('./backend/src/data', import.meta.url)),
  },
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
    public: {
      sentryDsn: '',
      // Parcours d'abonnement prestataire masqué pour le moment (le code est
      // conservé) : passer NUXT_PUBLIC_SUBSCRIPTION_ENABLED=true pour le
      // réactiver. Voir app/composables/useSubscriptionFeature.ts.
      subscriptionEnabled: false,
    }
  },
  app: {
    // Transition globale entre les pages (voir .page-* dans main.css).
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      // `htmlAttrs.lang` n'est plus figé ici : géré dynamiquement par
      // useLocaleHead() dans app.vue selon la langue active. Le thème est
      // appliqué par le plugin client, ce qui permet une CSP sans script inline.
    }
  },
  // Reverse proxy de développement `/api/* → backend Express`. En production,
  // nginx fournit le même relais ; le navigateur reste donc same-origin.
  // Cible surchargeable via NUXT_DEV_API_PROXY_TARGET (tunnel ou conteneur).
  $development: {
    nitro: {
      devProxy: {
        '/api': {
          target: `${process.env.NUXT_DEV_API_PROXY_TARGET ?? 'http://localhost:3001'}/api`,
          changeOrigin: true,
        },
      },
    },
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
