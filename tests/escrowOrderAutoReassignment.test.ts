import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { addSystemMessage, findOrCreateConversation, getMessages, resolveMessage } from '~~/server/utils/conversationStore'
import {
  createEscrowOrder,
  getEscrowOrderByConversationId,
  payEscrowOrder,
  PROVIDER_RESPONSE_TIMEOUT_MS,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

/** Reproduit ce que fait pay.post.ts (message order_confirmation posté après paiement), non exercé par payEscrowOrder seul. */
function payAndPostConfirmationPrompt(conversationId: string, client: string, provider: string, amount: number) {
  creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  payEscrowOrder(conversationId)
  addSystemMessage(conversationId, 'Confirmez-vous la prise en charge de cette commande ?', 'order_confirmation')
}

describe('Réattribution automatique — prestataire du même secteur/ville disponible (#289)', () => {
  it('ne réattribue pas avant le délai de réponse', () => {
    const client = id()
    const conversation = findOrCreateConversation(client, 'p02')
    payAndPostConfirmationPrompt(conversation.id, client, 'p02', 2500)

    const order = getEscrowOrderByConversationId(conversation.id)

    expect(order?.status).toBe('in_escrow')
  })

  it('ne réattribue pas si le prestataire a déjà confirmé la prise en charge', () => {
    const client = id()
    const conversation = findOrCreateConversation(client, 'p02')
    payAndPostConfirmationPrompt(conversation.id, client, 'p02', 2500)
    const messages = getMessages(conversation.id)
    const confirmationMessage = messages.at(-1)
    resolveMessage(conversation.id, confirmationMessage?.id ?? '')

    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    now += PROVIDER_RESPONSE_TIMEOUT_MS + 1
    const order = getEscrowOrderByConversationId(conversation.id)
    spy.mockRestore()

    expect(order?.status).toBe('in_escrow')
  })

  it('rembourse et transmet la demande au prestataire suivant du même secteur/ville après le délai', () => {
    const client = id()
    // p02 (Lomé, menage, note 4.6) → alternative attendue : p03 (Lomé, menage, note 4.9, la mieux notée hors p02).
    const conversation = findOrCreateConversation(client, 'p02')
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    payAndPostConfirmationPrompt(conversation.id, client, 'p02', 2500)
    now += PROVIDER_RESPONSE_TIMEOUT_MS + 1

    const order = getEscrowOrderByConversationId(conversation.id)
    spy.mockRestore()

    expect(order?.status).toBe('refunded')
    expect(getBalance(client)).toBe(2500)

    const newConversation = findOrCreateConversation(client, 'p03')
    const newOrder = getEscrowOrderByConversationId(newConversation.id)
    expect(newOrder).not.toBeNull()
    expect(newOrder?.status).toBe('awaiting_payment')
    expect(newOrder?.amount).toBe(1500)
  })

  it('laisse la commande en séquestre si aucune alternative n’existe dans le même secteur/ville', () => {
    const client = id()
    // p04 est seul prestataire menage à Kara dans l'annuaire de démo.
    const conversation = findOrCreateConversation(client, 'p04')
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    payAndPostConfirmationPrompt(conversation.id, client, 'p04', 4000)
    now += PROVIDER_RESPONSE_TIMEOUT_MS + 1

    const order = getEscrowOrderByConversationId(conversation.id)
    spy.mockRestore()

    expect(order?.status).toBe('in_escrow')
    const messages = getMessages(conversation.id)
    expect(messages.some((m) => m.body.includes('aucune alternative'))).toBe(true)
  })
})
