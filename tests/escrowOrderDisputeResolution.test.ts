import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { findOrCreateConversation } from '~~/server/utils/conversationStore'
import {
  confirmDisputeResolution,
  DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS,
  PROVIDER_DISPUTE_PENALTY_RATE,
} from '~~/server/utils/escrowDisputeResolution'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
import {
  createEscrowOrder,
  ESCROW_COMMISSION_RATE,
  getEscrowOrderByConversationId,
  markEscrowOrderDelivered,
  openEscrowDispute,
  payEscrowOrder,
  respondToDispute,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

async function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  await creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  await payEscrowOrder(conversationId)
  await recordEscrowOrderCheckIn(conversationId, null)
  await recordEscrowOrderCheckOut(conversationId, null)
  return markEscrowOrderDelivered(conversationId)
}

async function disputeAndRespond(conversationId: string) {
  await openEscrowDispute(conversationId, 'Prestation non conforme')
  await respondToDispute(conversationId, 'La prestation a été réalisée comme convenu.')
}

describe('confirmDisputeResolution — le chercheur tranche après la réponse du prestataire (#274)', () => {
  it('confirmed: true libère les fonds au prestataire, comme une validation normale', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await payAndDeliver(conversationId, client, provider, 5000)
    await disputeAndRespond(conversationId)

    const result = await confirmDisputeResolution(conversationId, true)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.status).toBe('released')
    expect(await getBalance(provider)).toBe(5000 - Math.round(5000 * ESCROW_COMMISSION_RATE))
  })

  it("confirmed: false rembourse le chercheur et pénalise le prestataire", async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await payAndDeliver(conversationId, client, provider, 5000)
    await disputeAndRespond(conversationId)
    // Solde préalable (autre commande déjà réglée) : sans quoi la pénalité serait plafonnée à 0 (voir le test suivant).
    await creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 10000, reference: 'autre-commande' })

    const result = await confirmDisputeResolution(conversationId, false)

    const penalty = Math.round(5000 * PROVIDER_DISPUTE_PENALTY_RATE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.status).toBe('refunded')
    expect(await getBalance(client)).toBe(5000 + penalty)
    expect(await getBalance(provider)).toBe(10000 - penalty)
  })

  it('la pénalité est plafonnée au solde disponible du prestataire (jamais de découvert)', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await payAndDeliver(conversationId, client, provider, 5000)
    await disputeAndRespond(conversationId)
    // Le prestataire n'a qu'un faible solde disponible (autre commande) : très inférieur à la pénalité théorique (750).
    await creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 10, reference: 'autre-commande' })

    await confirmDisputeResolution(conversationId, false)

    expect(await getBalance(provider)).toBe(0)
    // La compensation versée au chercheur correspond à la pénalité réellement prélevée (10), pas au montant théorique (750).
    expect(await getBalance(client)).toBe(5000 + 10)
  })

  it("refuse tant que le prestataire n'a pas répondu au litige", async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    await payAndDeliver(conversationId, id(), id(), 5000)
    await openEscrowDispute(conversationId, 'Prestation non conforme')

    expect(await confirmDisputeResolution(conversationId, true)).toEqual({ ok: false, error: 'awaiting_provider_response' })
  })

  it('refuse pour une commande qui n’est pas (ou plus) en litige', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    await payAndDeliver(conversationId, id(), id(), 5000)

    expect(await confirmDisputeResolution(conversationId, true)).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('renvoie not_found pour une conversation sans commande', async () => {
    expect(await confirmDisputeResolution(id(), true)).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('applyDisputeResolutionTimeoutIfExpired — silence du chercheur après la réponse du prestataire (#274)', () => {
  it('résout automatiquement en défaveur du prestataire passé le délai de confirmation', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await payAndDeliver(conversationId, client, provider, 5000)
    await disputeAndRespond(conversationId)
    await creditWallet({ walletUserId: provider, type: 'escrow_release', amount: 10000, reference: 'autre-commande' })
    now += DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS + 1

    const order = await getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('refunded')
    expect(await getBalance(client)).toBe(5000 + Math.round(5000 * PROVIDER_DISPUTE_PENALTY_RATE))
  })

  it('ne résout pas automatiquement avant le délai de confirmation', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await payAndDeliver(conversationId, client, provider, 5000)
    await disputeAndRespond(conversationId)
    now += DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS - 1000

    const order = await getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('disputed')
  })

  it('ne résout jamais automatiquement tant que le prestataire n’a pas répondu', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await payAndDeliver(conversationId, id(), id(), 5000)
    await openEscrowDispute(conversationId, 'Prestation non conforme')
    now += DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS + 1

    const order = await getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('disputed')
  })
})
