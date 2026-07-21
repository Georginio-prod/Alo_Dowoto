/**
 * Capture toute exception serveur non gérée (#262), au minimum les routes de
 * paiement/séquestre/webhook explicitement visées par l'issue — en pratique
 * le hook `error` de Nitro couvre l'ensemble de `server/api/**`, un
 * périmètre plus large qui inclut ces routes plutôt que de les cibler une à
 * une. No-op tant que `SENTRY_DSN` n'est pas configuré (voir
 * server/utils/errorReporting.ts).
 */
export default defineNitroPlugin((nitroApp) => {
  initServerErrorReporting()

  nitroApp.hooks.hook('error', (error, { event }) => {
    captureServerError(error, event ? { path: event.path, method: event.method } : undefined)
  })
})
