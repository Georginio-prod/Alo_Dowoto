interface SendMessageBody {
  body?: string
}

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

  const payload = await readBody<SendMessageBody>(event)
  const text = payload?.body?.trim()
  if (!text) {
    badRequest('Le message ne peut pas être vide.')
  }

  const message = addMessage(conversation.id, user.id, user.role, text)
  setResponseStatus(event, 201)
  return { message }
})
