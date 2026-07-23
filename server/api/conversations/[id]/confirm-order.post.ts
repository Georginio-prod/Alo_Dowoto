/**
 * Le prestataire confirme la prise en charge de la commande
 * (#hub-messages-automatiques), en réponse au message automatique WorkTogo
 * envoyé dès le paiement du chercheur (voir pay.post.ts). Enchaîne
 * immédiatement sur un message automatique adressé au chercheur pour qu'il
 * valide le partage de sa localisation (voir share-location.post.ts).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const pending = await findLatestUnresolvedMessage(conversation.id, 'order_confirmation')
  if (!pending) {
    conflict('Aucune demande de confirmation en attente pour cette conversation.')
  }

  await resolveMessage(conversation.id, pending.id)
  const confirmation = await addSystemMessage(conversation.id, 'Le prestataire a confirmé la prise en charge de la commande.')
  const locationRequest = await addSystemMessage(
    conversation.id,
    'Le chercheur peut partager sa localisation avec le prestataire pour faciliter l\'intervention.',
    'location_request',
  )

  setResponseStatus(event, 201)
  return { confirmation, locationRequest }
})
