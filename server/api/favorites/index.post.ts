export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)

  const { providerId } = await readSchemaBody(event, addFavoriteSchema)

  const favorite = await addFavorite(user.id, providerId)
  setResponseStatus(event, 201)
  return { favorite }
})
