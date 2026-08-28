/**
 * Supprime une période d'indisponibilité déclarée par le prestataire
 * connecté (#290) — il redevient visible dans les propositions pour ces
 * dates.
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    badRequest('Identifiant de période manquant.')
  }

  const removed = await removeUnavailabilityPeriod(user.id, id)
  if (!removed) {
    notFound('Aucune période d\'indisponibilité trouvée avec cet identifiant.')
  }

  return { ok: true }
})
