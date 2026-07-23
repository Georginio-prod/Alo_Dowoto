/**
 * Le chercheur confirme la réception/satisfaction (#195, epic #191) :
 * libère les fonds en séquestre vers le solde du prestataire, net de la
 * commission WorkTogo.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const result = await confirmEscrowOrderReceipt(conversation.id)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à confirmer pour cette conversation.')
    conflict("Cette commande ne peut pas être confirmée dans son état actuel (livraison attendue d'abord).")
  }

  return { order: result.order }
})
