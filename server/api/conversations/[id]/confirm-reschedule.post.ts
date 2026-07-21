/**
 * Le chercheur confirme le nouveau créneau proposé par le prestataire
 * (#270). Résout le dernier message `reschedule_request` non résolu — même
 * schéma que `confirm-order.post.ts`/`share-location.post.ts`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const pending = findLatestUnresolvedMessage(conversation.id, 'reschedule_request')
  if (!pending) {
    conflict('Aucune proposition de nouveau créneau en attente pour cette conversation.')
  }

  resolveMessage(conversation.id, pending.id)
  const confirmation = addSystemMessage(conversation.id, 'Le chercheur a confirmé le nouveau créneau proposé.')

  setResponseStatus(event, 201)
  return { confirmation }
})
