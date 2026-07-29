import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  createReferral,
  findUserIdByReferralCode,
  getOrCreateReferralCode,
  listReferralsByReferrer,
  REFERRAL_BONUS_AMOUNT,
  rewardReferralIfPending,
} from '~~/server/utils/referralStore'
import { createEscrowOrder, payEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'
import { findOrCreateUser, type NewUserProfile } from '~~/server/utils/userStore'

const PROFILE: NewUserProfile = {
  username: 'referral-test',
  firstName: 'Referral',
  lastName: 'Test',
  location: 'Lomé',
}

let counter = 0
async function newUser() {
  counter += 1
  const { user } = await findOrCreateUser(`+228${Date.now()}${counter}`, 'client', PROFILE)
  return user
}

describe('referralStore (#365, programme de parrainage)', () => {
  it('getOrCreateReferralCode génère un code stable sur les appels suivants', async () => {
    const user = await newUser()
    const first = await getOrCreateReferralCode(user.id)
    const second = await getOrCreateReferralCode(user.id)

    expect(first).toBe(second)
    expect(first).toHaveLength(6)
  })

  it('findUserIdByReferralCode retrouve le bon utilisateur, insensible à la casse', async () => {
    const user = await newUser()
    const code = await getOrCreateReferralCode(user.id)

    expect(await findUserIdByReferralCode(code.toLowerCase())).toBe(user.id)
    expect(await findUserIdByReferralCode(code)).toBe(user.id)
  })

  it('findUserIdByReferralCode renvoie null pour un code inconnu ou vide', async () => {
    expect(await findUserIdByReferralCode('INCONNU')).toBeNull()
    expect(await findUserIdByReferralCode('')).toBeNull()
  })

  it('listReferralsByReferrer liste les filleuls du plus récent au plus ancien', async () => {
    const referrer = await newUser()
    const referred1 = await newUser()
    const referred2 = await newUser()
    await createReferral(referrer.id, referred1.id)
    await createReferral(referrer.id, referred2.id)

    const referrals = await listReferralsByReferrer(referrer.id)
    expect(referrals.map((r) => r.referredId).sort()).toEqual([referred1.id, referred2.id].sort())
    expect(referrals.every((r) => r.status === 'pending')).toBe(true)
  })

  it('rewardReferralIfPending crédite le parrain ET le filleul au premier paiement réel', async () => {
    const referrer = await newUser()
    const referred = await newUser()
    await createReferral(referrer.id, referred.id)

    const result = await rewardReferralIfPending(referred.id)

    expect(result).toEqual({ rewarded: true, referrerId: referrer.id })
    expect(await getBalance(referrer.id)).toBe(REFERRAL_BONUS_AMOUNT)
    expect(await getBalance(referred.id)).toBe(REFERRAL_BONUS_AMOUNT)
  })

  it('rewardReferralIfPending est idempotent : un second appel ne crédite pas deux fois', async () => {
    const referrer = await newUser()
    const referred = await newUser()
    await createReferral(referrer.id, referred.id)

    await rewardReferralIfPending(referred.id)
    const second = await rewardReferralIfPending(referred.id)

    expect(second).toEqual({ rewarded: false })
    expect(await getBalance(referrer.id)).toBe(REFERRAL_BONUS_AMOUNT)
    expect(await getBalance(referred.id)).toBe(REFERRAL_BONUS_AMOUNT)
  })

  it('rewardReferralIfPending ne fait rien pour un utilisateur sans parrainage', async () => {
    const user = await newUser()
    expect(await rewardReferralIfPending(user.id)).toEqual({ rewarded: false })
    expect(await getBalance(user.id)).toBe(0)
  })

  it('le premier paiement en séquestre du filleul déclenche la récompense (#194 x #365)', async () => {
    const referrer = await newUser()
    const referred = await newUser()
    const provider = await newUser()
    await createReferral(referrer.id, referred.id)
    await creditWallet({ walletUserId: referred.id, type: 'recharge', amount: 10000, reference: 'RECHARGE-1' })

    const conversationId = randomUUID()
    await createEscrowOrder({ conversationId, clientId: referred.id, providerId: provider.id, amount: 3000 })
    const result = await payEscrowOrder(conversationId)

    expect(result.ok).toBe(true)
    expect(await getBalance(referrer.id)).toBe(REFERRAL_BONUS_AMOUNT)
    // Solde du filleul : recharge (10000) - séquestre (3000) + bonus (500).
    expect(await getBalance(referred.id)).toBe(10000 - 3000 + REFERRAL_BONUS_AMOUNT)
  })
})
