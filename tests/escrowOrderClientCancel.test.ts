import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  cancelEscrowOrderByClient,
  CLIENT_CANCELLATION_GRACE_PERIOD_MS,
  CLIENT_LATE_CANCELLATION_PENALTY_RATE,
} from '~~/server/utils/escrowClientCancellation'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
import {
  createEscrowOrder,
  markEscrowOrderDelivered,
  payEscrowOrder,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

async function payOnly(conversationId: string, client: string, provider: string, amount: number) {
  await creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  return payEscrowOrder(conversationId)
}

describe('cancelEscrowOrderByClient — grille d’annulation symétrique (#275)', () => {
  it('rembourse intégralement le chercheur dans le délai de grâce, sans indemniser le prestataire', async () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    await payOnly(conversationId, client, provider, 5000)

    const result = await cancelEscrowOrderByClient(conversationId, 'Finalement pas besoin')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('refunded')
      expect(result.providerCompensation).toBe(0)
    }
    expect(await getBalance(client)).toBe(5000)
    expect(await getBalance(provider)).toBe(0)
  })

  it('indemnise le prestataire et rembourse le solde au chercheur après le délai de grâce', async () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await payOnly(conversationId, client, provider, 5000)
    now += CLIENT_CANCELLATION_GRACE_PERIOD_MS + 1

    const result = await cancelEscrowOrderByClient(conversationId, 'Empêchement de dernière minute')
    spy.mockRestore()

    const expectedCompensation = Math.round(5000 * CLIENT_LATE_CANCELLATION_PENALTY_RATE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.providerCompensation).toBe(expectedCompensation)
    expect(await getBalance(provider)).toBe(expectedCompensation)
    expect(await getBalance(client)).toBe(5000 - expectedCompensation)
  })

  it('refuse sans motif', async () => {
    const conversationId = id()
    const client = id()
    await payOnly(conversationId, client, id(), 3000)

    expect(await cancelEscrowOrderByClient(conversationId, '   ')).toEqual({ ok: false, error: 'reason_required' })
    expect(await getBalance(client)).toBe(0)
  })

  it('refuse d’annuler une commande non payée (awaiting_payment)', async () => {
    const conversationId = id()
    await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })

    expect(await cancelEscrowOrderByClient(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('refuse d’annuler une commande déjà marquée terminée (delivered) — relève du litige, pas de l’annulation', async () => {
    const conversationId = id()
    const client = id()
    await payOnly(conversationId, client, id(), 3000)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)

    expect(await cancelEscrowOrderByClient(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('renvoie not_found pour une conversation sans commande', async () => {
    expect(await cancelEscrowOrderByClient(id(), 'motif')).toEqual({ ok: false, error: 'not_found' })
  })
})
