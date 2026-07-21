import * as Sentry from '@sentry/browser'

/**
 * Capture les erreurs Vue non gérées côté client (#262). Entièrement inerte
 * tant que `NUXT_PUBLIC_SENTRY_DSN` n'est pas configuré (aucun appel réseau)
 * — voir server/utils/errorReporting.ts pour le pendant serveur et le
 * contexte complet.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { sentryDsn } = useRuntimeConfig().public
  if (!sentryDsn) return

  Sentry.init({ dsn: sentryDsn, environment: import.meta.env.MODE })

  const previousErrorHandler = nuxtApp.vueApp.config.errorHandler
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    Sentry.captureException(error, { extra: { info } })
    previousErrorHandler?.(error, instance, info)
  }
})
