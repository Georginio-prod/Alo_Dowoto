/**
 * Le chercheur annule la commande après paiement, avant que la prestation
 * soit marquée terminée (#275, grille d'annulation symétrique). Pendant du
 * `cancel.post.ts` côté prestataire, avec une différence volontaire :
 * indemnisation du prestataire si l'annulation intervient après le délai de
 * grâce (voir `cancelEscrowOrderByClient`, `server/utils/escrowClientCancellation.ts`).
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readSchemaBody(event, cancelEscrowSchema)

  const result = await cancelEscrowOrderByClient(conversation.id, body.reason)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à annuler pour cette conversation.')
    if (result.error === 'reason_required') badRequest("Le motif d'annulation est obligatoire.")
    conflict('Cette commande ne peut plus être annulée à ce stade (déjà livrée, non payée, ou déjà clôturée).')
  }

  return { order: result.order, providerCompensation: result.providerCompensation }
})
