import { randomBytes } from 'node:crypto'
import { referralRepository, type ReferralRepository } from '../repositories/referralRepository'
import { userRepository, type UserRepository } from '../repositories/userRepository'
import { walletMovementRepository, type WalletMovementRepository } from '../repositories/walletMovementRepository'

/**
 * Programme de parrainage (#365). Logique **portée iso** depuis
 * `server/utils/referralStore.ts` (ADR-0016) : génération du code (même charset,
 * même longueur, même contrôle d'unicité), montant du bonus, tableau de suivi.
 */
export const REFERRAL_BONUS_AMOUNT = 500

/** Exclut les caractères ambigus (0/O, 1/I/L) pour un code lisible à l'oral/à l'écrit. */
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_GENERATION_ATTEMPTS = 10

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (const byte of bytes) code += CODE_CHARSET[byte % CODE_CHARSET.length]
  return code
}

export interface ReferralDashboardItem {
  id: string
  status: string
  createdAt: number
  rewardedAt: number | null
  referredName: string | null
}

export interface ReferralDashboard {
  referralCode: string
  bonusAmount: number
  referrals: ReferralDashboardItem[]
}

export type RewardReferralResult =
  | { rewarded: false }
  | { rewarded: true; referrerId: string }

export function createReferralService(
  repo: ReferralRepository = referralRepository,
  users: UserRepository = userRepository,
  wallet: WalletMovementRepository = walletMovementRepository,
) {
  async function generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const code = randomCode()
      const existing = await users.findByReferralCode(code)
      if (!existing) return code
    }
    throw new Error('Impossible de générer un code de parrainage unique.')
  }

  async function getOrCreateReferralCode(userId: string): Promise<string> {
    const user = await users.findById(userId)
    if (!user) throw new Error('Utilisateur introuvable.')
    if (user.referralCode) return user.referralCode
    const code = await generateUniqueReferralCode()
    await users.setReferralCode(userId, code)
    return code
  }

  return {
    getOrCreateReferralCode,

    /**
     * Lie un nouveau compte à son parrain à l'inscription (#365), à partir du
     * code saisi. Silencieux si le code est absent ou invalide : un code erroné
     * ne doit jamais bloquer une inscription. Iso `userStore.findOrCreateUser`
     * (bloc parrainage) + `referralStore.findUserIdByReferralCode`.
     */
    async linkReferralAtSignup(referredByCode: string | undefined, referredId: string): Promise<void> {
      const trimmed = referredByCode?.trim().toUpperCase()
      if (!trimmed) return
      const referrer = await users.findByReferralCode(trimmed)
      if (referrer) await repo.create(referrer.id, referredId)
    },

    /**
     * Récompense le parrainage d'un filleul à son **premier paiement réel**
     * (#365) : crédite le bonus au parrain ET au filleul, une seule fois
     * (idempotent). Sans effet si l'utilisateur n'a pas été parrainé ou si son
     * parrainage est déjà récompensé. Iso `referralStore.rewardReferralIfPending`.
     */
    async rewardReferralIfPending(referredUserId: string): Promise<RewardReferralResult> {
      const referral = await repo.findByReferred(referredUserId)
      if (!referral || referral.status !== 'pending') return { rewarded: false }

      const count = await repo.markRewarded(referral.id)
      if (count === 0) return { rewarded: false }

      await wallet.credit({ walletUserId: referral.referrerId, type: 'referral_bonus', amount: REFERRAL_BONUS_AMOUNT, reference: referral.id, counterpartyUserId: referral.referredId })
      await wallet.credit({ walletUserId: referral.referredId, type: 'referral_bonus', amount: REFERRAL_BONUS_AMOUNT, reference: referral.id, counterpartyUserId: referral.referrerId })

      return { rewarded: true, referrerId: referral.referrerId }
    },
    /** Réponse complète de `GET /api/referrals/me`, iso au handler Nitro. */
    async getDashboard(userId: string): Promise<ReferralDashboard> {
      const [referralCode, referrals] = await Promise.all([
        getOrCreateReferralCode(userId),
        repo.findByReferrer(userId),
      ])
      const referredUsers = await Promise.all(referrals.map((r) => users.findById(r.referredId)))
      return {
        referralCode,
        bonusAmount: REFERRAL_BONUS_AMOUNT,
        referrals: referrals.map((referral, index) => {
          const referred = referredUsers[index]
          return {
            id: referral.id,
            status: referral.status,
            createdAt: referral.createdAt.getTime(),
            rewardedAt: referral.rewardedAt?.getTime() ?? null,
            referredName: referred ? `${referred.firstName} ${referred.lastName}`.trim() : null,
          }
        }),
      }
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const referralService = createReferralService()
