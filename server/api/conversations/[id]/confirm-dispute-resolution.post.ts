/**
 * Le chercheur tranche un litige (#274) une fois que le prestataire y a
 * répondu : `confirmed: true` si la prestation est bien réalisée (les fonds
 * sont libérés au prestataire), `false` sinon (remboursement intégral et
 * pénalité au prestataire, voir escrowDisputeResolution.ts).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readSchemaBody(event, confirmDisputeResolutionSchema)

  const result = await confirmDisputeResolution(conversation.id, body.confirmed)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en litige pour cette conversation.')
    if (result.error === 'awaiting_provider_response') badRequest("Le prestataire n'a pas encore répondu au litige.")
    conflict("Cette commande n'est pas (ou plus) en litige.")
  }

  return { order: result.order }
})
