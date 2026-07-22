export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  return { subscription: await getSubscriptionByUserId(user.id) }
})
