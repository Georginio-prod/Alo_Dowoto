import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
import {
  createEscrowOrder,
  markEscrowOrderDelivered,
  openEscrowDispute,
  payEscrowOrder,
  respondToDispute,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

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

describe('openEscrowDispute — preuves à l’appui (#274)', () => {
  it('conserve les preuves fournies avec le motif', async () => {
    const conversationId = id()
    await payAndDeliver(conversationId, id(), id(), 3000)

    const result = await openEscrowDispute(conversationId, 'Prestation non conforme', 'Photo du résultat : photo.jpg')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.disputeEvidence).toBe('Photo du résultat : photo.jpg')
  })

  it('accepte l’absence de preuves (optionnelles)', async () => {
    const conversationId = id()
    await payAndDeliver(conversationId, id(), id(), 3000)

    const result = await openEscrowDispute(conversationId, 'Prestation non conforme')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.disputeEvidence).toBeNull()
  })
})

describe('respondToDispute — réponse du prestataire, passage en médiation (#274)', () => {
  it('enregistre la réponse du prestataire sans changer le statut (fonds toujours gelés)', async () => {
    const conversationId = id()
    await payAndDeliver(conversationId, id(), id(), 3000)
    await openEscrowDispute(conversationId, 'Prestation non conforme', 'photo.jpg')

    const result = await respondToDispute(conversationId, 'La prestation a été réalisée comme convenu.')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('disputed')
      expect(result.order.disputeResponse).toBe('La prestation a été réalisée comme convenu.')
      expect(result.order.disputeRespondedAt).not.toBeNull()
    }
  })

  it('refuse sans texte de réponse', async () => {
    const conversationId = id()
    await payAndDeliver(conversationId, id(), id(), 3000)
    await openEscrowDispute(conversationId, 'Prestation non conforme')

    expect(await respondToDispute(conversationId, '   ')).toEqual({ ok: false, error: 'response_required' })
  })

  it('refuse de répondre à une commande qui n’est pas (ou plus) en litige', async () => {
    const conversationId = id()
    await payAndDeliver(conversationId, id(), id(), 3000)

    expect(await respondToDispute(conversationId, 'réponse')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('renvoie not_found pour une conversation sans commande', async () => {
    expect(await respondToDispute(id(), 'réponse')).toEqual({ ok: false, error: 'not_found' })
  })
})
