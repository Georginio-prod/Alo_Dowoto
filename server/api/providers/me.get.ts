export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  return { profile: getProviderProfile(user.id) }
})
