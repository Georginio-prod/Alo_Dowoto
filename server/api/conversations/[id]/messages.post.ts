interface SendMessageBody {
  body?: string
}

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
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
