interface SubmitReviewBody {
  rating?: number
  comment?: string
}

/**
 * Notation mutuelle de fin de collaboration (#61) : l'auteur note « l'autre
 * partie » de la conversation — le prestataire si l'auteur est le client,
 * et inversement (voir la doc de conversationStore.ts pour le sens de
 * clientId/providerId).
 */
export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
  }

  const body = await readBody<SubmitReviewBody>(event)
  const rating = body?.rating
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    badRequest('La note doit être un entier entre 1 et 5.')
  }

  const targetId = user.id === conversation.clientId ? conversation.providerId : conversation.clientId

  const review = submitReview(conversation.id, user.id, targetId, rating, body?.comment)
  setResponseStatus(event, 201)
  return { review }
})
