/**
 * Périodes d'indisponibilité déclarées par le prestataire connecté (#290,
 * calendrier de disponibilité en temps réel).
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  return { periods: listUnavailabilityPeriods(user.id) }
})
