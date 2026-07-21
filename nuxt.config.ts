import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/eslint'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css', '~/assets/css/themes.css'],
  eslint: {
    config: {
      typescript: {
        strict: true
      }
    }
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
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap' }
      ],
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
