/** Statut de vérification d'identité du compte connecté (#180+1) — pas d'images renvoyées ici. */
export default defineEventHandler((event) => {
  const user = requireSessionUser(event)
  const verification = getVerification(user.id)

  return {
    verified: verification !== null,
    submittedAt: verification?.submittedAt ?? null,
  }
})
