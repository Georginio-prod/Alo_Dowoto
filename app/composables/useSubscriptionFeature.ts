/**
 * Interrupteur du parcours d'abonnement prestataire (formules, tunnel
 * /abonnement → /paiement, rappels et badges de statut).
 *
 * Le code du parcours est conservé intégralement : il est seulement masqué
 * tant que `NUXT_PUBLIC_SUBSCRIPTION_ENABLED` n'est pas à `true` (voir
 * `runtimeConfig.public.subscriptionEnabled` dans nuxt.config.ts). Quand le
 * flag est à `false` :
 * - les pages /formules, /abonnement et /paiement redirigent vers l'accueil
 *   (middleware `subscription-feature`) ;
 * - l'inscription prestataire se termine à l'étape « Infos » et envoie
 *   directement sur l'espace prestataire ;
 * - tous les liens, badges, bandeaux et sections qui y mènent sont retirés.
 *
 * Le backend (routes /api/subscriptions, quotas, admin) n'est pas touché :
 * un prestataire sans abonnement n'y est jamais bloqué pour être matché.
 */
export function useSubscriptionFeature() {
  const config = useRuntimeConfig()
  const enabled = computed(() => config.public.subscriptionEnabled === true)
  return { enabled }
}
