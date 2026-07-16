/**
 * Le prestataire marque la prestation comme terminée (#195, epic #191).
 * Démarre le délai de validation tacite de 72h côté chercheur (voir
 * server/utils/escrowOrderStore.ts).
 */
export default defineEventHandler((event) => {
  const user = requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const result = markEscrowOrderDelivered(conversation.id)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à livrer pour cette conversation.')
    conflict('Cette commande ne peut pas être marquée comme terminée dans son état actuel.')
  }

  return { order: result.order }
})
