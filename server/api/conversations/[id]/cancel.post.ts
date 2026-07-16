interface CancelEscrowBody {
  reason?: string
}

/**
 * Le prestataire annule la commande après le débit du chercheur (#196,
 * epic #191) : remboursement intégral et automatique, motif obligatoire.
 */
export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readBody<CancelEscrowBody>(event)
  const reason = body?.reason?.trim() ?? ''
  if (!reason) {
    badRequest("Le motif d'annulation est obligatoire.")
  }

  const result = cancelEscrowOrder(conversation.id, reason)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à annuler pour cette conversation.')
    if (result.error === 'reason_required') badRequest("Le motif d'annulation est obligatoire.")
    conflict('Cette commande ne peut plus être annulée (déjà libérée ou non payée).')
  }

  return { order: result.order }
})
