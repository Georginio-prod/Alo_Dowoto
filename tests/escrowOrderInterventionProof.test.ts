import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
import { createEscrowOrder, markEscrowOrderDelivered, payEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

function payOnly(conversationId: string, client: string, provider: string, amount: number) {
  creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  return payEscrowOrder(conversationId)
}

/**
 * Preuve d'intervention in-app (#268, anti-fuite) : le paiement (libération
 * des fonds via `markEscrowOrderDelivered` puis `confirmEscrowOrderReceipt`)
 * ne peut être déclenché sans un check-in et un check-out enregistrés.
 */
describe('recordEscrowOrderCheckIn / recordEscrowOrderCheckOut (#268)', () => {
  it('recordEscrowOrderCheckIn enregistre un horodatage et une localisation optionnelle', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)

    const result = recordEscrowOrderCheckIn(conversationId, { lat: 6.13, lng: 1.22 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.checkInAt).not.toBeNull()
      expect(result.order.checkInLocation).toEqual({ lat: 6.13, lng: 1.22 })
    }
  })

  it('recordEscrowOrderCheckIn accepte une localisation nulle (géolocalisation refusée)', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)

    const result = recordEscrowOrderCheckIn(conversationId, null)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.checkInLocation).toBeNull()
  })

  it('refuse un second check-in tant que le premier est actif', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)
    recordEscrowOrderCheckIn(conversationId, null)

    expect(recordEscrowOrderCheckIn(conversationId, null)).toEqual({ ok: false, error: 'already_checked_in' })
  })

  it('refuse un check-in pour une commande non payée (awaiting_payment)', () => {
    const conversationId = id()
    createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })

    expect(recordEscrowOrderCheckIn(conversationId, null)).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('refuse un check-out sans check-in préalable', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)

    expect(recordEscrowOrderCheckOut(conversationId, null)).toEqual({ ok: false, error: 'check_in_required' })
  })

  it('recordEscrowOrderCheckOut enregistre un horodatage après un check-in valide', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)
    recordEscrowOrderCheckIn(conversationId, null)

    const result = recordEscrowOrderCheckOut(conversationId, { lat: 6.14, lng: 1.23 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.checkOutAt).not.toBeNull()
      expect(result.order.checkOutLocation).toEqual({ lat: 6.14, lng: 1.23 })
    }
  })

  it('refuse un second check-out', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)
    recordEscrowOrderCheckIn(conversationId, null)
    recordEscrowOrderCheckOut(conversationId, null)

    expect(recordEscrowOrderCheckOut(conversationId, null)).toEqual({ ok: false, error: 'already_checked_out' })
  })

  it('renvoie not_found pour une conversation sans commande', () => {
    expect(recordEscrowOrderCheckIn(id(), null)).toEqual({ ok: false, error: 'not_found' })
    expect(recordEscrowOrderCheckOut(id(), null)).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('markEscrowOrderDelivered — bloqué sans preuve d’intervention complète (#268)', () => {
  it('refuse tant que le check-in n’a pas été enregistré', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)

    expect(markEscrowOrderDelivered(conversationId)).toEqual({ ok: false, error: 'check_in_out_required' })
  })

  it('refuse tant que le check-in est enregistré mais pas le check-out', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)
    recordEscrowOrderCheckIn(conversationId, null)

    expect(markEscrowOrderDelivered(conversationId)).toEqual({ ok: false, error: 'check_in_out_required' })
  })

  it('réussit une fois le check-in et le check-out enregistrés', () => {
    const conversationId = id()
    payOnly(conversationId, id(), id(), 3000)
    recordEscrowOrderCheckIn(conversationId, null)
    recordEscrowOrderCheckOut(conversationId, null)

    const result = markEscrowOrderDelivered(conversationId)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.status).toBe('delivered')
  })
})
