/**
 * Garde des pages du parcours d'abonnement (/formules, /abonnement,
 * /paiement) : tant que le parcours est masqué (voir
 * app/composables/useSubscriptionFeature.ts), ces pages ne sont plus
 * accessibles, même par URL directe, et renvoient vers l'accueil.
 */
export default defineNuxtRouteMiddleware(() => {
  const { enabled } = useSubscriptionFeature()
  if (!enabled.value) return navigateTo('/', { replace: true })
})
