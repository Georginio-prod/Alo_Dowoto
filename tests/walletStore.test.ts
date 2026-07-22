import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { MIN_WITHDRAWAL_AMOUNT, creditWallet, debitWallet, getBalance, listMovements, requestWithdrawal } from '~~/server/utils/walletStore'

/** Chaque test utilise un identifiant unique — isolation dans la base de test partagée (#342). */
function userId(): string {
  return randomUUID()
}

describe('walletStore (#192 modèle de données du solde & traçabilité)', () => {
  it('un portefeuille jamais utilisé a un solde de 0', async () => {
    expect(await getBalance(userId())).toBe(0)
  })

  it('creditWallet augmente le solde et journalise le mouvement', async () => {
    const user = userId()
    await creditWallet({ walletUserId: user, type: 'recharge', amount: 5000, reference: 'REF-1' })

    expect(await getBalance(user)).toBe(5000)
    const movements = await listMovements(user)
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({ type: 'recharge', amount: 5000, reference: 'REF-1' })
  })

  it('debitWallet diminue le solde quand les fonds sont suffisants', async () => {
    const user = userId()
    await creditWallet({ walletUserId: user, type: 'recharge', amount: 10000, reference: 'REF-1' })

    const movement = await debitWallet({ walletUserId: user, amount: 4000, reference: 'ORDER-1' })

    expect(movement).not.toBeNull()
    expect(movement?.type).toBe('escrow_debit')
    expect(await getBalance(user)).toBe(6000)
  })

  it('debitWallet refuse et ne journalise rien si le solde est insuffisant', async () => {
    const user = userId()
    await creditWallet({ walletUserId: user, type: 'recharge', amount: 1000, reference: 'REF-1' })

    const movement = await debitWallet({ walletUserId: user, amount: 4000, reference: 'ORDER-1' })

    expect(movement).toBeNull()
    expect(await getBalance(user)).toBe(1000)
    expect(await listMovements(user)).toHaveLength(1)
  })

  it('creditWallet rejette un montant négatif ou nul', async () => {
    const user = userId()
    await expect(creditWallet({ walletUserId: user, type: 'recharge', amount: 0, reference: 'REF-1' })).rejects.toThrow()
    await expect(creditWallet({ walletUserId: user, type: 'recharge', amount: -10, reference: 'REF-1' })).rejects.toThrow()
  })

  it('creditWallet rejette un mouvement escrow_debit (doit passer par debitWallet)', async () => {
    const user = userId()
    await expect(
      creditWallet({ walletUserId: user, type: 'escrow_debit', amount: 100, reference: 'REF-1' }),
    ).rejects.toThrow()
  })

  it('le solde est toujours recalculable à partir du journal complet des mouvements', async () => {
    const client = userId()
    const provider = userId()

    await creditWallet({ walletUserId: client, type: 'recharge', amount: 20000, reference: 'RECHARGE-1' })
    await debitWallet({ walletUserId: client, amount: 6000, reference: 'ORDER-1', counterpartyUserId: provider })
    await creditWallet({
      walletUserId: provider,
      type: 'escrow_release',
      amount: 5400,
      reference: 'ORDER-1',
      counterpartyUserId: client,
    })
    await creditWallet({ walletUserId: client, type: 'escrow_refund', amount: 1, reference: 'ORDER-2' })

    const recomputed = (await listMovements(client)).reduce((total, movement) => {
      const sign = movement.type === 'escrow_debit' ? -1 : 1
      return total + movement.amount * sign
    }, 0)

    expect(await getBalance(client)).toBe(recomputed)
    expect(await getBalance(provider)).toBe(5400)
  })

  it('listMovements trie du plus récent au plus ancien', async () => {
    const user = userId()
    let now = 1000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await creditWallet({ walletUserId: user, type: 'recharge', amount: 100, reference: 'A' })
    now += 10
    await creditWallet({ walletUserId: user, type: 'recharge', amount: 100, reference: 'B' })
    now += 10
    await creditWallet({ walletUserId: user, type: 'recharge', amount: 100, reference: 'C' })

    spy.mockRestore()

    expect((await listMovements(user)).map((m) => m.reference)).toEqual(['C', 'B', 'A'])
  })
})

describe('requestWithdrawal — retrait prestataire (« Solde », dashboard prestataire)', () => {
  it('débite le portefeuille et journalise un mouvement "retrait" quand les fonds sont suffisants', async () => {
    const provider = userId()
    await creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 20000, reference: 'ORDER-1' })

    const result = await requestWithdrawal(provider, MIN_WITHDRAWAL_AMOUNT)

    expect(result.ok).toBe(true)
    expect(await getBalance(provider)).toBe(20000 - MIN_WITHDRAWAL_AMOUNT)
    if (result.ok) expect(result.movement.type).toBe('retrait')
  })

  it('refuse un montant sous le retrait minimum, sans journaliser de mouvement', async () => {
    const provider = userId()
    await creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 20000, reference: 'ORDER-1' })

    const result = await requestWithdrawal(provider, MIN_WITHDRAWAL_AMOUNT - 1)

    expect(result).toEqual({ ok: false, error: 'below_minimum' })
    expect(await getBalance(provider)).toBe(20000)
  })

  it('refuse un retrait si le solde est insuffisant', async () => {
    const provider = userId()
    await creditWallet({ walletUserId: provider, type: 'escrow_release', amount: MIN_WITHDRAWAL_AMOUNT, reference: 'ORDER-1' })

    const result = await requestWithdrawal(provider, MIN_WITHDRAWAL_AMOUNT + 1000)

    expect(result).toEqual({ ok: false, error: 'insufficient_funds' })
    expect(await getBalance(provider)).toBe(MIN_WITHDRAWAL_AMOUNT)
  })
})
