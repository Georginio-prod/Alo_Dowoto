/**
 * Paiement bloquant en séquestre (#194, epic #191) : débite le portefeuille
 * du chercheur du tarif fixe du prestataire et met la commande en
 * séquestre. Tant que cette route n'a pas été appelée avec succès, le
 * prestataire ne voit pas le détail de la demande (voir messages.get.ts).
 *
 * Un message automatique WorkTogo est posté juste après (#hub-messages-automatiques) :
 * c'est le tout premier instant où le prestataire voit réellement la
 * conversation, donc le bon moment pour lui demander de confirmer la prise
 * en charge — voir conversations/[id]/confirm-order.post.ts pour la suite.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const result = await payEscrowOrder(conversation.id)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à payer pour cette conversation.')
    if (result.error === 'already_paid') conflict('Cette commande a déjà été payée.')
    paymentRequired('Solde insuffisant : rechargez votre portefeuille WorkTogo avant de payer cette commande.')
  }

  await addSystemMessage(
    conversation.id,
    'Nouvelle demande transmise et payée par le chercheur. Confirmez-vous la prise en charge de cette commande ?',
    'order_confirmation',
    { key: 'systemMessages.paymentConfirmationPrompt' },
  )

  return { order: result.order }
})
