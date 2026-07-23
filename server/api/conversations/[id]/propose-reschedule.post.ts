function formatProposedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Le prestataire propose un nouveau créneau directement dans l'app (#270),
 * pour éviter que les changements d'horaire ne se négocient par téléphone.
 * Posté comme un message du prestataire lui-même (pas un message système
 * WorkTogo), sur le même principe que `share-location.post.ts` pour le
 * chercheur. Le chercheur confirme via `confirm-reschedule.post.ts`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const order = await getEscrowOrderByConversationId(conversation.id)
  if (!order || (order.status !== 'in_escrow' && order.status !== 'delivered')) {
    conflict('Impossible de proposer un nouveau créneau pour cette commande dans son état actuel.')
  }

  const body = await readSchemaBody(event, proposeRescheduleSchema)
  const proposedAt = body.proposedAt
  if (proposedAt <= Date.now()) {
    badRequest('La date proposée doit être une date future valide.')
  }

  const note = body.note?.trim()
  const text = note
    ? `Nouveau créneau proposé : ${formatProposedDate(proposedAt)}. ${note}`
    : `Nouveau créneau proposé : ${formatProposedDate(proposedAt)}.`

  const message = await addMessage(conversation.id, user.id, user.role, text, { kind: 'reschedule_request', proposedAt })

  setResponseStatus(event, 201)
  return { message }
})
