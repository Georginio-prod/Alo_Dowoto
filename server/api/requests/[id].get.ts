export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const request = id ? getServiceRequest(id) : null

  if (!request || request.userId !== user.id) {
    notFound('Demande introuvable.')
  }

  return { request, matches: getStoredMatches(request.id) ?? [] }
})
