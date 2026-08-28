/**
 * Droit à la portabilité (#286, RGPD/audit sécurité) : export des données
 * personnelles du compte connecté, au format JSON structuré. N'inclut
 * jamais les images de vérification d'identité (base64) — seule leur
 * existence/statut est exposée, cohérent avec `server/api/verification/me.get.ts`
 * qui ne les expose pas non plus.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const providerProfile = user.role === 'prestataire' ? await getProviderProfile(user.id) : null
  const subscription = user.role === 'prestataire' ? await getSubscriptionByUserId(user.id) : null
  const verification = await getVerification(user.id)

  return {
    exportedAt: Date.now(),
    account: await toPublicUser(user),
    providerProfile,
    subscription,
    walletBalance: await getBalance(user.id),
    verification: verification
      ? { submittedAt: verification.submittedAt, purgedAt: verification.purgedAt }
      : null,
  }
})
