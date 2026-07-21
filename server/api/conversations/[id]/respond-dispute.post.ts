/**
 * Le prestataire répond à un litige ouvert par le chercheur (#274). Ne
 * change pas le statut de la commande (reste `disputed`, fonds gelés) —
 * marque le passage effectif en médiation : chercheur et prestataire se
 * sont tous deux exprimés, à l'équipe de médiation WorkTogo d'arbitrer.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readSchemaBody(event, respondDisputeSchema)

  const result = respondToDispute(conversation.id, body.response)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en litige pour cette conversation.')
    if (result.error === 'response_required') badRequest('Votre réponse au litige est obligatoire.')
    conflict("Cette commande n'est pas (ou plus) en litige.")
  }

  return { order: result.order }
})
