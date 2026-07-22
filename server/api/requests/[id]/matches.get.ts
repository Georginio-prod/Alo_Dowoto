const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const request = id ? getServiceRequest(id) : null

  if (!request || request.userId !== user.id) {
    notFound('Demande introuvable.')
  }

  const rawLimit = getQuery(event).limit
  const parsedLimit = typeof rawLimit === 'string' ? Number(rawLimit) : NaN
  const limit = Number.isFinite(parsedLimit) ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit))) : DEFAULT_LIMIT

  // Recalcul à la demande (contrairement à GET /api/requests/:id qui renvoie
  // l'instantané figé au moment de la création de la demande).
  return { matches: await computeMatches(request, limit) }
})
