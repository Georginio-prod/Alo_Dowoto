/**
 * Paiement bloquant en séquestre (#194, epic #191) : débite le portefeuille
 * du chercheur du tarif fixe du prestataire et met la commande en
 * séquestre. Tant que cette route n'a pas été appelée avec succès, le
 * prestataire ne voit pas le détail de la demande (voir messages.get.ts).
 */
export default defineEventHandler((event) => {
  const user = requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const result = payEscrowOrder(conversation.id)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à payer pour cette conversation.')
    if (result.error === 'already_paid') conflict('Cette commande a déjà été payée.')
    paymentRequired('Solde insuffisant : rechargez votre portefeuille WorkTogo avant de payer cette commande.')
  }

  return { order: result.order }
})
