import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  cancelEscrowOrder,
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  ESCROW_COMMISSION_RATE,
  getEscrowOrderByConversationId,
  markEscrowOrderDelivered,
  payEscrowOrder,
  TACIT_VALIDATION_DELAY_MS,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance, PLATFORM_WALLET_USER_ID } from '~~/server/utils/walletStore'

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

function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  payEscrowOrder(conversationId)
  return markEscrowOrderDelivered(conversationId)
}

describe('escrowOrderStore — double validation et libération (#195)', () => {
  it('markEscrowOrderDelivered échoue si la commande n’est pas en séquestre', () => {
    const conversationId = id()
    createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    expect(markEscrowOrderDelivered(conversationId)).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('markEscrowOrderDelivered passe la commande en "delivered"', () => {
    const conversationId = id()
    const result = payAndDeliver(conversationId, id(), id(), 3000)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('delivered')
      expect(result.order.deliveredAt).not.toBeNull()
    }
  })

  it('confirmEscrowOrderReceipt libère les fonds nets de commission vers le prestataire et crédite la commission', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    payAndDeliver(conversationId, client, provider, 10000)

    const result = confirmEscrowOrderReceipt(conversationId)

    const expectedCommission = Math.round(10000 * ESCROW_COMMISSION_RATE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.status).toBe('released')
    expect(getBalance(provider)).toBe(10000 - expectedCommission)
    expect(getBalance(PLATFORM_WALLET_USER_ID)).toBe(expectedCommission)
  })

  it('confirmEscrowOrderReceipt échoue tant que la prestation n’est pas marquée terminée', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    payEscrowOrder(conversationId)

    expect(confirmEscrowOrderReceipt(conversationId)).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('une commande livrée depuis plus de 72h est libérée automatiquement à la prochaine lecture (validation tacite)', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    payAndDeliver(conversationId, client, provider, 5000)
    now += TACIT_VALIDATION_DELAY_MS + 1

    const order = getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('released')
    expect(getBalance(provider)).toBe(5000 - Math.round(5000 * ESCROW_COMMISSION_RATE))
  })

  it('une commande livrée depuis moins de 72h n’est pas libérée automatiquement', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    payAndDeliver(conversationId, client, provider, 5000)
    now += TACIT_VALIDATION_DELAY_MS - 1000

    const order = getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('delivered')
    expect(getBalance(provider)).toBe(0)
  })
})

describe('cancelEscrowOrder — annulation prestataire et remboursement (#196)', () => {
  it('rembourse intégralement le chercheur quand la commande est en séquestre (in_escrow)', () => {
    const conversationId = id()
    const client = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    payEscrowOrder(conversationId)

    const result = cancelEscrowOrder(conversationId, 'Empêchement de dernière minute')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('refunded')
      expect(result.order.cancelReason).toBe('Empêchement de dernière minute')
    }
    expect(getBalance(client)).toBe(5000)
  })

  it('rembourse intégralement (sans commission) même si la prestation a déjà été marquée terminée (delivered)', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    payEscrowOrder(conversationId)
    markEscrowOrderDelivered(conversationId)

    const result = cancelEscrowOrder(conversationId, 'Finalement indisponible')

    expect(result.ok).toBe(true)
    expect(getBalance(client)).toBe(3000)
    expect(getBalance(provider)).toBe(0)
  })

  it('refuse sans motif', () => {
    const conversationId = id()
    const client = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    payEscrowOrder(conversationId)

    expect(cancelEscrowOrder(conversationId, '   ')).toEqual({ ok: false, error: 'reason_required' })
    expect(getBalance(client)).toBe(0)
  })

  it('refuse d’annuler une commande non payée', () => {
    const conversationId = id()
    createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    expect(cancelEscrowOrder(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('refuse d’annuler une commande déjà libérée', () => {
    const conversationId = id()
    const client = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    payEscrowOrder(conversationId)
    markEscrowOrderDelivered(conversationId)
    confirmEscrowOrderReceipt(conversationId)

    expect(cancelEscrowOrder(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('renvoie not_found pour une conversation sans commande', () => {
    expect(cancelEscrowOrder(id(), 'motif')).toEqual({ ok: false, error: 'not_found' })
  })
})
