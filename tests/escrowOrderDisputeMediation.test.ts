import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
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

function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  payEscrowOrder(conversationId)
  return markEscrowOrderDelivered(conversationId)
}

describe('openEscrowDispute — preuves à l’appui (#274)', () => {
  it('conserve les preuves fournies avec le motif', () => {
    const conversationId = id()
    payAndDeliver(conversationId, id(), id(), 3000)

    const result = openEscrowDispute(conversationId, 'Prestation non conforme', 'Photo du résultat : photo.jpg')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.disputeEvidence).toBe('Photo du résultat : photo.jpg')
  })

  it('accepte l’absence de preuves (optionnelles)', () => {
    const conversationId = id()
    payAndDeliver(conversationId, id(), id(), 3000)

    const result = openEscrowDispute(conversationId, 'Prestation non conforme')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.disputeEvidence).toBeNull()
  })
})

describe('respondToDispute — réponse du prestataire, passage en médiation (#274)', () => {
  it('enregistre la réponse du prestataire sans changer le statut (fonds toujours gelés)', () => {
    const conversationId = id()
    payAndDeliver(conversationId, id(), id(), 3000)
    openEscrowDispute(conversationId, 'Prestation non conforme', 'photo.jpg')

    const result = respondToDispute(conversationId, 'La prestation a été réalisée comme convenu.')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('disputed')
      expect(result.order.disputeResponse).toBe('La prestation a été réalisée comme convenu.')
      expect(result.order.disputeRespondedAt).not.toBeNull()
    }
  })

  it('refuse sans texte de réponse', () => {
    const conversationId = id()
    payAndDeliver(conversationId, id(), id(), 3000)
    openEscrowDispute(conversationId, 'Prestation non conforme')

    expect(respondToDispute(conversationId, '   ')).toEqual({ ok: false, error: 'response_required' })
  })

  it('refuse de répondre à une commande qui n’est pas (ou plus) en litige', () => {
    const conversationId = id()
    payAndDeliver(conversationId, id(), id(), 3000)

    expect(respondToDispute(conversationId, 'réponse')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('renvoie not_found pour une conversation sans commande', () => {
    expect(respondToDispute(id(), 'réponse')).toEqual({ ok: false, error: 'not_found' })
  })
})
