import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createRecharge, getRecharge, resolveRecharge } from '~~/server/utils/walletRechargeStore'
import { getBalance } from '~~/server/utils/walletStore'

function userId(): string {
  return randomUUID()
}

describe('walletRechargeStore (#193 recharge T-Money / Flooz)', () => {
  it('une recharge démarre en attente et ne crédite rien tant que non résolue', () => {
    const user = userId()
    const recharge = createRecharge({ userId: user, provider: 'flooz', phone: '90000000', amount: 5000 })

    expect(recharge.status).toBe('pending')
    expect(getBalance(user)).toBe(0)
  })

  it('une résolution confirmée crédite le portefeuille du montant recharge', () => {
    const user = userId()
    const recharge = createRecharge({ userId: user, provider: 'tmoney', phone: '91000000', amount: 3000 })

    const resolved = resolveRecharge(recharge.id, 'confirmed', 'OP-REF-1')

    expect(resolved?.status).toBe('confirmed')
    expect(getBalance(user)).toBe(3000)
  })

  it('une résolution en échec ne crédite jamais le portefeuille', () => {
    const user = userId()
    const recharge = createRecharge({ userId: user, provider: 'flooz', phone: '90000000', amount: 3000 })

    const resolved = resolveRecharge(recharge.id, 'failed')

    expect(resolved?.status).toBe('failed')
    expect(getBalance(user)).toBe(0)
  })

  it('la résolution est idempotente : un second appel ne recrédite pas', () => {
    const user = userId()
    const recharge = createRecharge({ userId: user, provider: 'flooz', phone: '90000000', amount: 3000 })

    resolveRecharge(recharge.id, 'confirmed')
    resolveRecharge(recharge.id, 'confirmed')

    expect(getBalance(user)).toBe(3000)
  })

  it('résoudre une recharge inexistante renvoie null', () => {
    expect(resolveRecharge('inexistant', 'confirmed')).toBeNull()
  })

  it('getRecharge retrouve la recharge par id', () => {
    const user = userId()
    const recharge = createRecharge({ userId: user, provider: 'tmoney', phone: '91000000', amount: 1000 })
    expect(getRecharge(recharge.id)?.id).toBe(recharge.id)
    expect(getRecharge('inexistant')).toBeNull()
  })
})
