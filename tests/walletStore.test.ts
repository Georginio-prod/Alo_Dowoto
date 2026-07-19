import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { MIN_WITHDRAWAL_AMOUNT, creditWallet, debitWallet, getBalance, listMovements, requestWithdrawal } from '~~/server/utils/walletStore'

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

describe('requestWithdrawal — retrait prestataire (« Solde », dashboard prestataire)', () => {
  it('débite le portefeuille et journalise un mouvement "retrait" quand les fonds sont suffisants', () => {
    const provider = userId()
    creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 20000, reference: 'ORDER-1' })

    const result = requestWithdrawal(provider, MIN_WITHDRAWAL_AMOUNT)

    expect(result.ok).toBe(true)
    expect(getBalance(provider)).toBe(20000 - MIN_WITHDRAWAL_AMOUNT)
    if (result.ok) expect(result.movement.type).toBe('retrait')
  })

  it('refuse un montant sous le retrait minimum, sans journaliser de mouvement', () => {
    const provider = userId()
    creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 20000, reference: 'ORDER-1' })

    const result = requestWithdrawal(provider, MIN_WITHDRAWAL_AMOUNT - 1)

    expect(result).toEqual({ ok: false, error: 'below_minimum' })
    expect(getBalance(provider)).toBe(20000)
  })

  it('refuse un retrait si le solde est insuffisant', () => {
    const provider = userId()
    creditWallet({ walletUserId: provider, type: 'escrow_release', amount: MIN_WITHDRAWAL_AMOUNT, reference: 'ORDER-1' })

    const result = requestWithdrawal(provider, MIN_WITHDRAWAL_AMOUNT + 1000)

    expect(result).toEqual({ ok: false, error: 'insufficient_funds' })
    expect(getBalance(provider)).toBe(MIN_WITHDRAWAL_AMOUNT)
  })
})
