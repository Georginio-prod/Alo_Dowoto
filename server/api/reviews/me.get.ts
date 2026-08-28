/** Note moyenne et nombre d'avis reçus par l'utilisateur connecté (chercheur ou prestataire), pour « Mon espace ». */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const { average, count } = await getAverageRating(user.id)
  return { rating: { average, count } }
})
