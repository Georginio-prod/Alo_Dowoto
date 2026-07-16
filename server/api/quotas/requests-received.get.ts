export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const subscription = getSubscriptionByUserId(user.id)
  // Un abonnement en attente ou expiré n'ouvre pas droit à un quota de
  // demandes reçues, au même titre qu'une absence totale d'abonnement.
  const plan = subscription?.status === 'actif' ? subscription.plan : null
  return { usage: getProviderRequestsUsage(user.id, plan) }
})
