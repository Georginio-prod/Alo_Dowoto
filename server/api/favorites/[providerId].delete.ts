export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)

  const providerId = getRouterParam(event, 'providerId')
  if (!providerId) {
    badRequest('Identifiant du prestataire manquant.')
  }

  await removeFavorite(user.id, providerId)
  return { ok: true }
})
