export default defineEventHandler((event) => {
  const user = requireProviderRole(event)
  return { profile: getProviderProfile(user.id) }
})
