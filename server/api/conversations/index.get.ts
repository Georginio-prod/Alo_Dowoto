export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const conversations = await Promise.all(
    listConversationsForUser(user.id).map((conversation) => toConversationSummary(conversation, user.id)),
  )

  return { conversations }
})
