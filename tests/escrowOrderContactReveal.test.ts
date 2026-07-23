import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { findOrCreateConversation, getMessages, setClientContact } from '~~/server/utils/conversationStore'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
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

/**
 * `markEscrowOrderDelivered` poste toujours un message système (#273) : la
 * conversation doit donc réellement exister (Message.conversationId est une
 * clé étrangère vers Conversation, #357) — contrairement à `EscrowOrder`,
 * dont `conversationId` n'est qu'un identifiant sans contrainte.
 */
async function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  await creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  await payEscrowOrder(conversationId)
  await recordEscrowOrderCheckIn(conversationId, null)
  await recordEscrowOrderCheckOut(conversationId, null)
  return markEscrowOrderDelivered(conversationId)
}

describe('hasReleasedOrderBetween — démasquage des coordonnées après validation finale (#264)', () => {
  it('renvoie false tant qu’aucune commande n’a été libérée entre ce client et ce prestataire', async () => {
    const client = id()
    const provider = id()
    expect(await hasReleasedOrderBetween(client, provider)).toBe(false)

    const conversation = await findOrCreateConversation(client, provider)
    await payAndDeliver(conversation.id, client, provider, 3000)
    expect(await hasReleasedOrderBetween(client, provider)).toBe(false)
  })

  it('renvoie true une fois la commande libérée (confirmation explicite du chercheur)', async () => {
    const client = id()
    const provider = id()
    const conversation = await findOrCreateConversation(client, provider)
    await payAndDeliver(conversation.id, client, provider, 3000)

    await confirmEscrowOrderReceipt(conversation.id)

    expect(await hasReleasedOrderBetween(client, provider)).toBe(true)
  })

  it('ne renvoie pas true pour une autre paire client/prestataire', async () => {
    const client = id()
    const provider = id()
    const conversation = await findOrCreateConversation(client, provider)
    await payAndDeliver(conversation.id, client, provider, 3000)
    await confirmEscrowOrderReceipt(conversation.id)

    expect(await hasReleasedOrderBetween(client, id())).toBe(false)
    expect(await hasReleasedOrderBetween(id(), provider)).toBe(false)
  })
})

describe('releaseOrderFunds — révélation des coordonnées du chercheur à la validation finale (#264)', () => {
  it('poste un message système avec le contact réel une fois la commande libérée', async () => {
    const client = id()
    const provider = id()
    const conversation = await findOrCreateConversation(client, provider)
    const conversationId = conversation.id
    await setClientContact(conversationId, '+228 90 12 34 56')
    await payAndDeliver(conversationId, client, provider, 3000)

    await confirmEscrowOrderReceipt(conversationId)

    const messages = await getMessages(conversationId)
    const systemMessage = messages.find((m) => m.body.includes('+228 90 12 34 56'))
    expect(systemMessage).toBeDefined()
    expect(systemMessage?.senderRole).toBe('system')
  })

  it("ne poste aucun message de révélation si aucun contact n'a été enregistré", async () => {
    const client = id()
    const provider = id()
    const conversation = await findOrCreateConversation(client, provider)
    const conversationId = conversation.id
    await payAndDeliver(conversationId, client, provider, 3000)
    // Capturé après la livraison (qui poste déjà le message de notification
    // d'échéance, #273) pour isoler spécifiquement le comportement de
    // révélation du contact à la libération des fonds.
    const beforeRelease = (await getMessages(conversationId)).length

    await confirmEscrowOrderReceipt(conversationId)

    expect((await getMessages(conversationId)).length).toBe(beforeRelease)
  })
})
