import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/eslint'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
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
  app: {
    // Transition globale entre les pages (voir .page-* dans main.css).
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
