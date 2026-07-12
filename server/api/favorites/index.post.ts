interface AddFavoriteBody {
  providerId?: string
}

export default defineEventHandler(async (event) => {
  const user = requireClientRole(event)

  const body = await readBody<AddFavoriteBody>(event)
  const providerId = body?.providerId?.trim()
  if (!providerId) {
    badRequest('L\'identifiant du prestataire est requis.')
  }

  const favorite = addFavorite(user.id, providerId)
  setResponseStatus(event, 201)
  return { favorite }
})
