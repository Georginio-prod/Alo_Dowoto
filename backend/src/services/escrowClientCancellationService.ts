import { escrowOrderRepository, type EscrowOrder } from '../repositories/escrowOrderRepository'
import { walletMovementRepository } from '../repositories/walletMovementRepository'
import { getRawEscrowOrder } from './escrowOrderService'

/**
 * Grille d'annulation symétrique côté chercheur (#275), portée iso depuis
 * `server/utils/escrowClientCancellation.ts` (ADR-0016). Délai de grâce : sans
 * pénalité dans les 2h suivant le paiement ; passé ce délai, une part reste
 * acquise au prestataire à titre d'indemnisation, le solde est remboursé.
 */

export const CLIENT_CANCELLATION_GRACE_PERIOD_MS = 2 * 60 * 60 * 1000
export const CLIENT_LATE_CANCELLATION_PENALTY_RATE = 0.2

export type CancelByClientResult =
  | { ok: true; order: EscrowOrder; providerCompensation: number }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/** Le chercheur annule après paiement, avant la livraison (#275). Iso Nitro. */
export async function cancelEscrowOrderByClient(conversationId: string, reason: string): Promise<CancelByClientResult> {
  const order = await getRawEscrowOrder(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const isWithinGracePeriod = order.paidAt !== null && Date.now() - order.paidAt < CLIENT_CANCELLATION_GRACE_PERIOD_MS
  const providerCompensation = isWithinGracePeriod ? 0 : Math.round(order.amount * CLIENT_LATE_CANCELLATION_PENALTY_RATE)
  const clientRefund = order.amount - providerCompensation
  const now = Date.now()

  // Atomicité (#366) : compensation prestataire + remboursement chercheur +
  // passage `refunded` dans une seule transaction, relecture idempotente.
  const applied = await escrowOrderRepository.transaction(async (tx) => {
    const fresh = await escrowOrderRepository.findByIdIn(tx, order.id)
    if (!fresh || fresh.status !== 'in_escrow') return false
    if (providerCompensation > 0) {
      await walletMovementRepository.credit({ walletUserId: order.providerId, type: 'cancellation_compensation', amount: providerCompensation, reference: order.id, counterpartyUserId: order.clientId }, tx)
    }
    if (clientRefund > 0) {
      await walletMovementRepository.credit({ walletUserId: order.clientId, type: 'escrow_refund', amount: clientRefund, reference: order.id, counterpartyUserId: order.providerId }, tx)
    }
    await escrowOrderRepository.update(order.id, { status: 'refunded', cancelledAt: new Date(now), cancelReason: reason.trim() }, tx)
    return true
  })
  if (!applied) return { ok: false, error: 'invalid_status' }

  return { ok: true, order: { ...order, status: 'refunded', cancelledAt: now, cancelReason: reason.trim() }, providerCompensation }
}
