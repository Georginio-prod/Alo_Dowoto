export default defineEventHandler((event) => {
  const user = requireClientRole(event)
  return { usage: getClientContactsUsage(user.id) }
})
