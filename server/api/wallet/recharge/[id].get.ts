/**
 * Statut d'une recharge en cours (#190), interrogé en polling par la page
 * « Mon solde » le temps de la confirmation opérateur simulée (voir
 * server/api/wallet/recharge.post.ts), même mécanique que
 * server/api/payments/[id].get.ts pour les paiements d'abonnement.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const recharge = id ? getRecharge(id) : null

  if (!recharge || recharge.userId !== user.id) {
    notFound('Recharge introuvable.')
  }

  return { recharge }
})
