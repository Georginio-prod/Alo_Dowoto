import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { creditWallet, debitWallet, getBalance, listMovements } from '~~/server/utils/walletStore'

function userId(): string {
  return randomUUID()
}

describe('walletStore (#192 modèle de données du solde & traçabilité)', () => {
  it('un portefeuille jamais utilisé a un solde de 0', () => {
    expect(getBalance(userId())).toBe(0)
  })

  it('creditWallet augmente le solde et journalise le mouvement', () => {
    const user = userId()
    creditWallet({ walletUserId: user, type: 'recharge', amount: 5000, reference: 'REF-1' })

    expect(getBalance(user)).toBe(5000)
    const movements = listMovements(user)
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({ type: 'recharge', amount: 5000, reference: 'REF-1' })
  })

  it('debitWallet diminue le solde quand les fonds sont suffisants', () => {
    const user = userId()
    creditWallet({ walletUserId: user, type: 'recharge', amount: 10000, reference: 'REF-1' })

    const movement = debitWallet({ walletUserId: user, amount: 4000, reference: 'ORDER-1' })

    expect(movement).not.toBeNull()
    expect(movement?.type).toBe('escrow_debit')
    expect(getBalance(user)).toBe(6000)
  })

  it('debitWallet refuse et ne journalise rien si le solde est insuffisant', () => {
    const user = userId()
    creditWallet({ walletUserId: user, type: 'recharge', amount: 1000, reference: 'REF-1' })

    const movement = debitWallet({ walletUserId: user, amount: 4000, reference: 'ORDER-1' })

    expect(movement).toBeNull()
    expect(getBalance(user)).toBe(1000)
    expect(listMovements(user)).toHaveLength(1)
  })

  it('creditWallet rejette un montant négatif ou nul', () => {
    const user = userId()
    expect(() => creditWallet({ walletUserId: user, type: 'recharge', amount: 0, reference: 'REF-1' })).toThrow()
    expect(() => creditWallet({ walletUserId: user, type: 'recharge', amount: -10, reference: 'REF-1' })).toThrow()
  })

  it('creditWallet rejette un mouvement escrow_debit (doit passer par debitWallet)', () => {
    const user = userId()
    expect(() =>
      creditWallet({ walletUserId: user, type: 'escrow_debit', amount: 100, reference: 'REF-1' }),
    ).toThrow()
  })

  it('le solde est toujours recalculable à partir du journal complet des mouvements', () => {
    const client = userId()
    const provider = userId()

    creditWallet({ walletUserId: client, type: 'recharge', amount: 20000, reference: 'RECHARGE-1' })
    debitWallet({ walletUserId: client, amount: 6000, reference: 'ORDER-1', counterpartyUserId: provider })
    creditWallet({
      walletUserId: provider,
      type: 'escrow_release',
      amount: 5400,
      reference: 'ORDER-1',
      counterpartyUserId: client,
    })
    creditWallet({ walletUserId: client, type: 'escrow_refund', amount: 0.01, reference: 'ORDER-2' })

    const recomputed = listMovements(client).reduce((total, movement) => {
      const sign = movement.type === 'escrow_debit' ? -1 : 1
      return total + movement.amount * sign
    }, 0)

    expect(getBalance(client)).toBe(recomputed)
    expect(getBalance(provider)).toBe(5400)
  })

  it('listMovements trie du plus récent au plus ancien', () => {
    const user = userId()
    let now = 1000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    creditWallet({ walletUserId: user, type: 'recharge', amount: 100, reference: 'A' })
    now += 10
    creditWallet({ walletUserId: user, type: 'recharge', amount: 100, reference: 'B' })
    now += 10
    creditWallet({ walletUserId: user, type: 'recharge', amount: 100, reference: 'C' })

    spy.mockRestore()

    expect(listMovements(user).map((m) => m.reference)).toEqual(['C', 'B', 'A'])
  })
})
