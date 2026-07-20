interface ShareLocationBody {
  lat?: number
  lng?: number
}

/**
 * Le chercheur valide le partage de sa localisation
 * (#hub-messages-automatiques), en réponse au message automatique WorkTogo
 * envoyé dès que le prestataire confirme la prise en charge (voir
 * confirm-order.post.ts). Les coordonnées sont capturées côté client
 * (géolocalisation du navigateur) et simplement relayées ici sous forme de
 * message dans la conversation — pas de suivi en continu, un seul point
 * partagé à la demande.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const pending = findLatestUnresolvedMessage(conversation.id, 'location_request')
  if (!pending) {
    conflict('Aucune demande de localisation en attente pour cette conversation.')
  }

  const body = await readBody<ShareLocationBody>(event)
  const lat = body?.lat
  const lng = body?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    badRequest('Coordonnées de localisation invalides.')
  }

  resolveMessage(conversation.id, pending.id)
  const message = addMessage(conversation.id, user.id, user.role, '📍 Localisation partagée avec le prestataire.', {
    kind: 'location_shared',
    location: { lat, lng },
  })

  setResponseStatus(event, 201)
  return { message }
})
