export default defineEventHandler((event) => {
  const user = requireProviderRole(event)
  return { subscription: getSubscriptionByUserId(user.id) }
})
