/**
 * Historique des paiements d'abonnement confirmés de l'utilisateur connecté
 * (#363) — alimente la liste téléchargeable de reçus sur « Solde » prestataire.
 * `plan` : un seul abonnement par compte (association 1-1, voir
 * subscriptionStore.ts), donc une formule commune à tous les paiements
 * renvoyés plutôt qu'un champ par paiement.
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const [payments, subscription] = await Promise.all([
    listConfirmedPaymentsByUser(user.id),
    getSubscriptionByUserId(user.id),
  ])
  return { payments, plan: subscription?.plan ?? null }
})
