import { randomBytes } from 'node:crypto'
import { referralRepository, type ReferralRepository } from '../repositories/referralRepository'
import { userRepository, type UserRepository } from '../repositories/userRepository'

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

export function createReferralService(
  repo: ReferralRepository = referralRepository,
  users: UserRepository = userRepository,
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
