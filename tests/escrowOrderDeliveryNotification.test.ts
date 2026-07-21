import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { findOrCreateConversation, getMessages } from '~~/server/utils/conversationStore'
import { createEscrowOrder, markEscrowOrderDelivered, payEscrowOrder, TACIT_VALIDATION_DELAY_MS } from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

/**
 * Le chercheur dispose de 72h (TACIT_VALIDATION_DELAY_MS) après la livraison
 * pour confirmer ou contester avant libération automatique des fonds (#195).
 * #273 exige qu'il en soit notifié avant l'échéance plutôt que de le
 * découvrir seulement en consultant la conversation par hasard.
 */
describe('markEscrowOrderDelivered — notification de l’échéance de validation tacite (#273)', () => {
  it('poste un message système annonçant l’échéance dès la livraison', () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    createEscrowOrder({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000 })
    payEscrowOrder(conversation.id)

    const before = getMessages(conversation.id).length
    markEscrowOrderDelivered(conversation.id)
    const messages = getMessages(conversation.id)

    expect(messages.length).toBe(before + 1)
    const notification = messages[messages.length - 1]
    expect(notification?.senderRole).toBe('system')
    expect(notification?.body).toContain('confirmer la réception')
    expect(notification?.body).toContain('automatiquement libéré')
  })

  it('le message est compté comme non lu par le chercheur (visible via le badge existant, #225)', () => {
    const client = id()
    const provider = id()
    const conversation = findOrCreateConversation(client, provider)
    creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    createEscrowOrder({ conversationId: conversation.id, clientId: client, providerId: provider, amount: 5000 })
    payEscrowOrder(conversation.id)

    markEscrowOrderDelivered(conversation.id)

    const notification = getMessages(conversation.id).at(-1)
    expect(notification?.senderId).not.toBe(client)
  })

  it('ne poste aucun message si la commande n’est pas en séquestre (rien à livrer)', () => {
    const conversationId = id()
    createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })

    const before = getMessages(conversationId).length
    markEscrowOrderDelivered(conversationId)

    expect(getMessages(conversationId).length).toBe(before)
  })
})

describe('TACIT_VALIDATION_DELAY_MS — cohérence avec le message affiché (#273)', () => {
  it('vaut bien 72 heures, valeur reprise dans le message de notification', () => {
    expect(TACIT_VALIDATION_DELAY_MS).toBe(72 * 60 * 60 * 1000)
  })
})
