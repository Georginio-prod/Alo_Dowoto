/**
 * Centre de notifications (#360, premier incrément) : les 30 plus récentes
 * de l'utilisateur connecté, plus le compteur de non-lues (badge cloche).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user.id),
    countUnreadNotifications(user.id),
  ])

  return { notifications, unreadCount }
})
