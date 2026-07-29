/**
 * Programme de parrainage (#365) : le code de parrainage de l'utilisateur
 * connecté et son tableau de suivi (filleuls, statut du bonus).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const [referralCode, referrals] = await Promise.all([
    getOrCreateReferralCode(user.id),
    listReferralsByReferrer(user.id),
  ])

  const referredUsers = await Promise.all(referrals.map((referral) => getUserById(referral.referredId)))

  return {
    referralCode,
    bonusAmount: REFERRAL_BONUS_AMOUNT,
    referrals: referrals.map((referral, index) => {
      const referred = referredUsers[index]
      return {
        id: referral.id,
        status: referral.status,
        createdAt: referral.createdAt,
        rewardedAt: referral.rewardedAt,
        referredName: referred ? `${referred.firstName} ${referred.lastName}`.trim() : null,
      }
    }),
  }
})
