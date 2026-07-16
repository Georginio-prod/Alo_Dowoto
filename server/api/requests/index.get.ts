/** Liste les demandes du client connecté, pour « Mon espace » (#64). */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  return { requests: listRequestsByUser(user.id) }
})
