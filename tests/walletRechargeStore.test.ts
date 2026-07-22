import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createRecharge, getRecharge, resolveRecharge } from '~~/server/utils/walletRechargeStore'
import { getBalance } from '~~/server/utils/walletStore'

function userId(): string {
  return randomUUID()
}

describe('walletRechargeStore (#193 recharge T-Money / Flooz)', () => {
  it('une recharge démarre en attente et ne crédite rien tant que non résolue', async () => {
    const user = userId()
    const recharge = await createRecharge({ userId: user, provider: 'flooz', phone: '90000000', amount: 5000 })

    expect(recharge.status).toBe('pending')
    expect(await getBalance(user)).toBe(0)
  })

  it('une résolution confirmée crédite le portefeuille du montant recharge', async () => {
    const user = userId()
    const recharge = await createRecharge({ userId: user, provider: 'tmoney', phone: '91000000', amount: 3000 })

    const resolved = await resolveRecharge(recharge.id, 'confirmed', 'OP-REF-1')

    expect(resolved?.status).toBe('confirmed')
    expect(await getBalance(user)).toBe(3000)
  })

  it('une résolution en échec ne crédite jamais le portefeuille', async () => {
    const user = userId()
    const recharge = await createRecharge({ userId: user, provider: 'flooz', phone: '90000000', amount: 3000 })

    const resolved = await resolveRecharge(recharge.id, 'failed')

    expect(resolved?.status).toBe('failed')
    expect(await getBalance(user)).toBe(0)
  })

  it('la résolution est idempotente : un second appel ne recrédite pas', async () => {
    const user = userId()
    const recharge = await createRecharge({ userId: user, provider: 'flooz', phone: '90000000', amount: 3000 })

    await resolveRecharge(recharge.id, 'confirmed')
    await resolveRecharge(recharge.id, 'confirmed')

    expect(await getBalance(user)).toBe(3000)
  })

  it('résoudre une recharge inexistante renvoie null', async () => {
    expect(await resolveRecharge(randomUUID(), 'confirmed')).toBeNull()
  })

  it('getRecharge retrouve la recharge par id', async () => {
    const user = userId()
    const recharge = await createRecharge({ userId: user, provider: 'tmoney', phone: '91000000', amount: 1000 })
    expect((await getRecharge(recharge.id))?.id).toBe(recharge.id)
    expect(await getRecharge(randomUUID())).toBeNull()
  })
})
