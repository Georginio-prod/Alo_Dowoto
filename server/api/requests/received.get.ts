/** Liste les demandes reçues (matchées) par le prestataire connecté, pour « Demandes reçues » (dashboard prestataire). */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  return { matches: listRequestsForProvider(user.id) }
})
