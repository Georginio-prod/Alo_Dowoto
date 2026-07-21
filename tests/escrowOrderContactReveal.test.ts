import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { findOrCreateConversation, getMessages, setClientContact } from '~~/server/utils/conversationStore'
import {
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  hasReleasedOrderBetween,
  markEscrowOrderDelivered,
  payEscrowOrder,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  payEscrowOrder(conversationId)
  return markEscrowOrderDelivered(conversationId)
}

describe('hasReleasedOrderBetween — démasquage des coordonnées après validation finale (#264)', () => {
  it('renvoie false tant qu’aucune commande n’a été libérée entre ce client et ce prestataire', () => {
    const client = id()
    const provider = id()
    expect(hasReleasedOrderBetween(client, provider)).toBe(false)

    payAndDeliver(id(), client, provider, 3000)
    expect(hasReleasedOrderBetween(client, provider)).toBe(false)
  })

  it('renvoie true une fois la commande libérée (confirmation explicite du chercheur)', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    payAndDeliver(conversationId, client, provider, 3000)

    confirmEscrowOrderReceipt(conversationId)

    expect(hasReleasedOrderBetween(client, provider)).toBe(true)
  })

  it('ne renvoie pas true pour une autre paire client/prestataire', () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    payAndDeliver(conversationId, client, provider, 3000)
    confirmEscrowOrderReceipt(conversationId)

    expect(hasReleasedOrderBetween(client, id())).toBe(false)
    expect(hasReleasedOrderBetween(id(), provider)).toBe(false)
  })
})

describe('releaseOrderFunds — révélation des coordonnées du chercheur à la validation finale (#264)', () => {
  it('poste un message système avec le contact réel une fois la commande libérée', () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    const conversationId = conversation.id
    setClientContact(conversationId, '+228 90 12 34 56')
    payAndDeliver(conversationId, client, provider, 3000)

    confirmEscrowOrderReceipt(conversationId)

    const systemMessage = getMessages(conversationId).find((m) => m.body.includes('+228 90 12 34 56'))
    expect(systemMessage).toBeDefined()
    expect(systemMessage?.senderRole).toBe('system')
  })

  it("ne poste aucun message de révélation si aucun contact n'a été enregistré", () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    payAndDeliver(conversationId, client, provider, 3000)
    // Capturé après la livraison (qui poste déjà le message de notification
    // d'échéance, #273) pour isoler spécifiquement le comportement de
    // révélation du contact à la libération des fonds.
    const beforeRelease = getMessages(conversationId).length

    confirmEscrowOrderReceipt(conversationId)

    expect(getMessages(conversationId).length).toBe(beforeRelease)
  })
})
