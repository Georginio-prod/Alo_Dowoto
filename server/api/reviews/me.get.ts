/** Note moyenne et nombre d'avis reçus par l'utilisateur connecté (chercheur ou prestataire), pour « Mon espace ». */
export default defineEventHandler((event) => {
  const user = requireSessionUser(event)
  const { average, count } = getAverageRating(user.id)
  return { rating: { average, count } }
})
