export default defineEventHandler((event) => {
  const user = requireSessionUser(event)

  const conversations = listConversationsForUser(user.id).map((conversation) =>
    toConversationSummary(conversation, user.id),
  )

  return { conversations }
})
