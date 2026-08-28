/** Statut de vérification d'identité du compte connecté (#180+1) — pas d'images renvoyées ici. */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const verification = await getVerification(user.id)

  return {
    verified: verification !== null,
    submittedAt: verification?.submittedAt ?? null,
  }
})
