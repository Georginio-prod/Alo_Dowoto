export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
  }
  // Le client doit d'abord compléter le formulaire de première prise de
  // contact (#129, POST .../first-contact) : le serveur ne fait pas
  // confiance à l'affichage front de ce formulaire.
  if (user.role === 'client' && user.id === conversation.clientId && !conversation.firstContactDone) {
    conflict('Complétez le formulaire de première prise de contact avant d\'envoyer un message.')
  }

  const { body: text } = await readSchemaBody(event, sendMessageSchema)

  // Anti-contournement (#265) : un numéro, un e-mail ou une mention de
  // paiement hors plateforme dans un message libre est bloqué avant
  // écriture, et journalisé pour l'équipe support.
  const contournementReason = detectContournementAttempt(text)
  if (contournementReason) {
    await logContournementAttempt({ conversationId: conversation.id, userId: user.id, reason: contournementReason, text })
    badRequest('Ce message semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU. Utilisez la messagerie WorkTogo pour tous vos échanges.')
  }

  const message = addMessage(conversation.id, user.id, user.role, text)
  setResponseStatus(event, 201)
  return { message }
})
