/** Marque toutes les notifications de l'utilisateur connecté comme lues (ouverture du centre de notifications, #360). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  await markAllNotificationsRead(user.id)
  return { ok: true }
})
