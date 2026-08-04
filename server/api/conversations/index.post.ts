/**
 * Crée (ou retrouve, idempotent) la conversation avec un prestataire — c'est
 * la route appelée par le bouton « Contacter » des résultats de matching
 * (#59). Réservée aux comptes client : c'est toujours le client qui amorce
 * le premier contact dans ce prototype.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  if (!isVerified(user.id)) {
    forbidden("Vérifiez votre identité avant de contacter un prestataire (carte d'identité + photo passeport).")
  }
  // #dashboard-admin (module anti-désintermédiation) : un compte restreint par
  // l'équipe WorkTogo ne peut plus initier de nouveau fil, mais garde l'accès
  // à ses conversations déjà ouvertes (ne bloque pas une mission en cours).
  if (user.messagingRestricted) {
    forbidden('Votre messagerie est restreinte. Contactez le support WorkTogo pour plus de détails.')
  }

  const { providerId } = await readSchemaBody(event, createConversationSchema)

  // `providerId` référence soit l'annuaire de démo (server/utils/providerDirectory.ts,
  // pas de vrai compte), soit un vrai compte prestataire — voir la documentation de
  // conversationStore.ts. Un vrai prestataire non vérifié ne doit pas pouvoir être
  // contacté : c'est le seul moment où sa vérification est réellement testable dans
  // ce prototype (le matching public reste branché sur l'annuaire de démo, #45/#46).
  const providerUser = await getUserById(providerId)
  if (providerUser && !isVerified(providerUser.id)) {
    forbidden("Ce prestataire n'a pas encore terminé sa vérification d'identité.")
  }

  const conversation = await findOrCreateConversation(user.id, providerId)
  return { conversation: await toConversationSummary(conversation, user.id) }
})
