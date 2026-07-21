import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  cancelEscrowOrder,
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  markEscrowOrderDelivered,
  openEscrowDispute,
  payEscrowOrder,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

/**
 * Reprendre un prestataire (#266) repose sur `createEscrowOrder` qui accepte
 * une nouvelle commande sur une conversation dont la précédente est
 * terminale (`released`/`refunded`) — sinon elle reste idempotente comme
 * avant (#194), pour ne jamais écraser une commande active.
 */
describe('createEscrowOrder — reprise après une commande terminale (#266)', () => {
  it('reste idempotente tant que la commande précédente est active (awaiting_payment)', () => {
    const conversationId = id()
    const first = createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    const second = createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 9000 })

    expect(second.id).toBe(first.id)
    expect(second.amount).toBe(3000)
  })

  it('reste idempotente tant que la commande précédente est en séquestre (in_escrow)', () => {
    const conversationId = id()
    const client = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    const first = createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    payEscrowOrder(conversationId)

    const second = createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 9000 })
    expect(second.id).toBe(first.id)
  })

  it('crée une toute nouvelle commande une fois la précédente libérée (released)', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    const first = createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    payEscrowOrder(conversationId)
    markEscrowOrderDelivered(conversationId)
    confirmEscrowOrderReceipt(conversationId)

    const second = createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 4500 })

    expect(second.id).not.toBe(first.id)
    expect(second.amount).toBe(4500)
    expect(second.status).toBe('awaiting_payment')
  })

  it('crée une toute nouvelle commande une fois la précédente remboursée (refunded)', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    const first = createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    payEscrowOrder(conversationId)
    cancelEscrowOrder(conversationId, 'Empêchement de dernière minute')

    const second = createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })

    expect(second.id).not.toBe(first.id)
    expect(second.status).toBe('awaiting_payment')
  })

  it('reste idempotente tant qu’un litige est en cours (disputed) — pas de reprise possible pendant une médiation', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    const first = createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    payEscrowOrder(conversationId)
    markEscrowOrderDelivered(conversationId)
    openEscrowDispute(conversationId, 'Prestation non conforme')

    const second = createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    expect(second.id).toBe(first.id)
  })
})
