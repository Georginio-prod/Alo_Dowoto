export default defineEventHandler((event) => {
  const user = requireClientRole(event)

  const providerId = getRouterParam(event, 'providerId')
  if (!providerId) {
    badRequest('Identifiant du prestataire manquant.')
  }

  removeFavorite(user.id, providerId)
  return { ok: true }
})
