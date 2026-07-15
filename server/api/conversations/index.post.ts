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
  const user = requireClientRole(event)
  if (!isVerified(user.id)) {
    forbidden("Vérifiez votre identité avant de contacter un prestataire (carte d'identité + photo passeport).")
  }

  const body = await readBody<CreateConversationBody>(event)
  const providerId = body?.providerId?.trim()
  if (!providerId) {
    badRequest('providerId est requis.')
  }

  // `providerId` référence soit l'annuaire de démo (server/utils/providerDirectory.ts,
  // pas de vrai compte), soit un vrai compte prestataire — voir la documentation de
  // conversationStore.ts. Un vrai prestataire non vérifié ne doit pas pouvoir être
  // contacté : c'est le seul moment où sa vérification est réellement testable dans
  // ce prototype (le matching public reste branché sur l'annuaire de démo, #45/#46).
  const providerUser = getUserById(providerId)
  if (providerUser && !isVerified(providerUser.id)) {
    forbidden("Ce prestataire n'a pas encore terminé sa vérification d'identité.")
  }

  const conversation = findOrCreateConversation(user.id, providerId)
  return { conversation: toConversationSummary(conversation, user.id) }
})
