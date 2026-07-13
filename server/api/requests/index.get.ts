/** Liste les demandes du client connecté, pour « Mon espace » (#64). */
export default defineEventHandler((event) => {
  const user = requireClientRole(event)
  return { requests: listRequestsByUser(user.id) }
})
