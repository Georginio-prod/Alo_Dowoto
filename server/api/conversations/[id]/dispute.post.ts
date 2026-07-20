/**
 * Le chercheur ouvre un litige au lieu de confirmer la réception (#197,
 * epic #191) : gèle les fonds en séquestre en attendant l'arbitrage d'une
 * équipe de médiation WorkTogo, motif obligatoire.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readSchemaBody(event, disputeEscrowSchema)

  const result = openEscrowDispute(conversation.id, body.reason)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à contester pour cette conversation.')
    if (result.error === 'reason_required') badRequest('Le motif du litige est obligatoire.')
    conflict("Cette commande ne peut pas être contestée dans son état actuel (livraison attendue d'abord).")
  }

  return { order: result.order }
})
