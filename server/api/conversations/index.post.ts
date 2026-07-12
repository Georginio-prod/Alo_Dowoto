interface CreateConversationBody {
  providerId?: string
}

/**
 * Crée (ou retrouve, idempotent) la conversation avec un prestataire — c'est
 * la route appelée par le bouton « Contacter » des résultats de matching
 * (#59). Réservée aux comptes client : c'est toujours le client qui amorce
 * le premier contact dans ce prototype.
 */
export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  if (user.role !== 'client') {
    forbidden('Réservé aux comptes client.')
  }

  const body = await readBody<CreateConversationBody>(event)
  const providerId = body?.providerId?.trim()
  if (!providerId) {
    badRequest('providerId est requis.')
  }

  const conversation = findOrCreateConversation(user.id, providerId)
  return { conversation: toConversationSummary(conversation, user.id) }
})
