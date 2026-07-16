/**
 * Solde courant et historique des mouvements du portefeuille interne
 * WorkTogo de l'utilisateur connecté (#192). Alimente la puce de solde dans
 * la navbar chercheur (#189) et le panneau détaillé « Mon solde » (#190).
 */
export default defineEventHandler((event) => {
  const user = requireSessionUser(event)

  return {
    balance: getBalance(user.id),
    movements: listMovements(user.id),
  }
})
