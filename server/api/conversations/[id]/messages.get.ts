export default defineEventHandler((event) => {
  const user = requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  // Ownership check regroupé (comme requests/[id]/matches.get.ts) : on ne
  // distingue pas "inexistante" de "pas la vôtre" pour ne pas révéler
  // l'existence d'une conversation à un tiers.
  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
  }

  return {
    conversation: toConversationSummary(conversation, user.id),
    messages: getMessages(conversation.id),
  }
})
