interface AddAvailabilityBody {
  startDate?: string
  endDate?: string
}

/**
 * Déclare une période d'indisponibilité (#290) : le prestataire n'apparaît
 * plus dans les propositions de recherche/matching pour ces dates (voir
 * `providerAvailabilityStore.ts` et `providerDirectory.searchProviders`).
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const body = await readBody<AddAvailabilityBody>(event)

  if (!body?.startDate || !body?.endDate) {
    badRequest('Les dates de début et de fin sont requises.')
  }

  const result = addUnavailabilityPeriod(user.id, body.startDate, body.endDate)

  if (!result.ok) {
    if (result.error === 'invalid_date') badRequest('Format de date invalide (attendu : AAAA-MM-JJ).')
    badRequest('La date de fin doit être postérieure ou égale à la date de début.')
  }

  setResponseStatus(event, 201)
  return { period: result.period }
})
