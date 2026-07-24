/**
 * Le prestataire enregistre son arrivée sur le lieu d'intervention (#268,
 * preuve d'intervention in-app anti-fuite). Requiert que la commande soit en
 * séquestre (`in_escrow`) — c'est-à-dire payée mais pas encore livrée. La
 * géolocalisation est facultative (le navigateur peut la refuser) : seul
 * l'horodatage fait foi, voir `markEscrowOrderDelivered` qui bloque la
 * livraison tant que check-in et check-out ne sont pas tous deux enregistrés.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readSchemaBody(event, checkInOutSchema)
  const location = body.lat !== undefined && body.lng !== undefined ? { lat: body.lat, lng: body.lng } : null

  const result = await recordEscrowOrderCheckIn(conversation.id, location)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en cours pour cette conversation.')
    if (result.error === 'already_checked_in') conflict('Un check-in a déjà été enregistré pour cette prestation.')
    conflict('Le check-in n\'est possible que pour une commande payée et non encore livrée.')
  }

  return { order: result.order }
})
