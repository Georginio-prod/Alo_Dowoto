/**
 * Déclare une période d'indisponibilité (#290) : le prestataire n'apparaît
 * plus dans les propositions de recherche/matching pour ces dates (voir
 * `providerAvailabilityStore.ts` et `providerDirectory.searchProviders`).
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const { startDate, endDate } = await readSchemaBody(event, addAvailabilitySchema)

  const result = await addUnavailabilityPeriod(user.id, startDate, endDate)

  if (!result.ok) {
    if (result.error === 'invalid_date') badRequest('Format de date invalide (attendu : AAAA-MM-JJ).')
    badRequest('La date de fin doit être postérieure ou égale à la date de début.')
  }

  setResponseStatus(event, 201)
  return { period: result.period }
})
