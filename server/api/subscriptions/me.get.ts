export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  return { subscription: getSubscriptionByUserId(user.id) }
})
