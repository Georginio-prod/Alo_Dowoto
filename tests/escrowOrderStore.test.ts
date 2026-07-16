import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createEscrowOrder, getEscrowOrderByConversationId, payEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

describe('escrowOrderStore (#194 devis, engagement et paiement bloquant)', () => {
  it('createEscrowOrder crée une commande en attente de paiement', () => {
    const conversationId = id()
    const order = createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })

    expect(order.status).toBe('awaiting_payment')
    expect(order.paidAt).toBeNull()
    expect(getEscrowOrderByConversationId(conversationId)?.id).toBe(order.id)
  })

  it('createEscrowOrder est idempotent pour une même conversation', () => {
    const conversationId = id()
    const first = createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    const second = createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 9999 })

    expect(second.id).toBe(first.id)
    expect(second.amount).toBe(3000)
  })

  it('payEscrowOrder débite le chercheur et met la commande en séquestre si le solde est suffisant', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })

    const result = payEscrowOrder(conversationId)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('in_escrow')
      expect(result.order.paidAt).not.toBeNull()
    }
    expect(getBalance(client)).toBe(2000)
  })

  it('payEscrowOrder refuse si le solde est insuffisant, sans modifier la commande', () => {
    const conversationId = id()
    const client = id()
    createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })

    const result = payEscrowOrder(conversationId)

    expect(result).toEqual({ ok: false, error: 'insufficient_funds' })
    expect(getEscrowOrderByConversationId(conversationId)?.status).toBe('awaiting_payment')
    expect(getBalance(client)).toBe(0)
  })

  it('payEscrowOrder refuse une commande déjà payée', () => {
    const conversationId = id()
    const client = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })

    payEscrowOrder(conversationId)
    const second = payEscrowOrder(conversationId)

    expect(second).toEqual({ ok: false, error: 'already_paid' })
    expect(getBalance(client)).toBe(2000)
  })

  it('payEscrowOrder renvoie not_found pour une conversation sans commande', () => {
    expect(payEscrowOrder(id())).toEqual({ ok: false, error: 'not_found' })
  })
})
