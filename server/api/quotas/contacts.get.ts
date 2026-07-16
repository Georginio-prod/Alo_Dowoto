export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  return { usage: getClientContactsUsage(user.id) }
})
