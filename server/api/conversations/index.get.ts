export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const userConversations = await listConversationsForUser(user.id)
  const conversations = await Promise.all(
    userConversations.map((conversation) => toConversationSummary(conversation, user.id)),
  )

  return { conversations }
})
