import { escrowOrderRepository, type EscrowOrder } from '../repositories/escrowOrderRepository'
import { walletMovementRepository } from '../repositories/walletMovementRepository'
import { addSystemMessage } from './conversationService'
import { getRawEscrowOrder, releaseOrderFunds } from './escrowOrderService'

/**
 * Dénouement d'un litige (#274) une fois que le prestataire y a répondu. Porté
 * iso depuis `server/utils/escrowDisputeResolution.ts` (ADR-0016). Extrait
 * d'`escrowOrderService` (limite de lignes) ; `applyDisputeResolutionTimeoutIfExpired`
 * y est réimportée pour la chaîne de vérifications paresseuses de
 * `getEscrowOrderByConversationId`.
 */

/** Part de la commande retenue au prestataire quand un litige se résout en sa défaveur. */
export const PROVIDER_DISPUTE_PENALTY_RATE = 0.15

/** Délai laissé au chercheur pour confirmer après la réponse du prestataire (#274). */
export const DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS = 48 * 60 * 60 * 1000

async function resolveDisputeAgainstProvider(
  order: EscrowOrder,
  outcomeMessage: string,
  translationKey: 'systemMessages.disputeResolvedTimeout' | 'systemMessages.disputeResolvedNotDone',
): Promise<EscrowOrder> {
  const now = Date.now()
  const cancelReason = `Litige résolu en défaveur du prestataire : ${outcomeMessage}`

  // Atomicité (#366) : remboursement chercheur + pénalité prestataire +
  // compensation chercheur + passage `refunded`, tout ou rien. Relecture du
  // statut = garde d'idempotence (timeout OU confirmation explicite).
  const applied = await escrowOrderRepository.transaction(async (tx) => {
    const fresh = await escrowOrderRepository.findByIdIn(tx, order.id)
    if (!fresh || fresh.status !== 'disputed') return false
    await walletMovementRepository.credit({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId }, tx)
    const penalty = await walletMovementRepository.debitForPenalty({
      walletUserId: order.providerId,
      amount: Math.round(order.amount * PROVIDER_DISPUTE_PENALTY_RATE),
      reference: order.id,
      counterpartyUserId: order.clientId,
    }, tx)
    if (penalty && penalty.amount > 0) {
      await walletMovementRepository.credit({ walletUserId: order.clientId, type: 'dispute_compensation', amount: penalty.amount, reference: order.id, counterpartyUserId: order.providerId }, tx)
    }
    await escrowOrderRepository.update(order.id, { status: 'refunded', cancelledAt: new Date(now), cancelReason }, tx)
    return true
  })
  if (!applied) {
    // Déjà dénoué par un chemin concurrent : renvoie l'état effectif sans
    // ré-émettre de message ni retoucher les portefeuilles.
    const current = await getRawEscrowOrder(order.conversationId)
    return current ?? { ...order, status: 'refunded', cancelledAt: now, cancelReason }
  }

  await addSystemMessage(
    order.conversationId,
    `${outcomeMessage} Remboursement intégral effectué au chercheur, et une pénalité a été appliquée au prestataire.`,
    'text',
    { key: translationKey },
  )

  return { ...order, status: 'refunded', cancelledAt: now, cancelReason }
}

/**
 * Passé le délai de confirmation après la réponse du prestataire, le silence du
 * chercheur ne profite pas au prestataire (sa version est contestée). Appelée
 * depuis `getEscrowOrderByConversationId`. Iso Nitro.
 */
export async function applyDisputeResolutionTimeoutIfExpired(order: EscrowOrder): Promise<EscrowOrder> {
  if (order.status !== 'disputed' || order.disputeResponse === null || order.disputeRespondedAt === null) return order
  if (Date.now() - order.disputeRespondedAt < DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS) return order
  return resolveDisputeAgainstProvider(
    order,
    "Le chercheur n'a pas confirmé dans le délai imparti après la réponse du prestataire.",
    'systemMessages.disputeResolvedTimeout',
  )
}

export type AdminArbitrationResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' }

/**
 * Arbitrage d'un litige par un administrateur (#admin) : tranche directement.
 * `provider` → libération ; `client` → remboursement + pénalité. Mêmes
 * primitives atomiques/idempotentes (#366). Iso Nitro.
 */
export async function adminArbitrateDispute(conversationId: string, outcome: 'provider' | 'client'): Promise<AdminArbitrationResult> {
  const order = await getRawEscrowOrder(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'disputed') return { ok: false, error: 'invalid_status' }

  const updated =
    outcome === 'provider'
      ? await releaseOrderFunds(order)
      : await resolveDisputeAgainstProvider(order, 'Litige tranché par un administrateur en faveur du chercheur.', 'systemMessages.disputeResolvedNotDone')
  return { ok: true, order: updated }
}

export type ConfirmDisputeResolutionResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'awaiting_provider_response' }

/** Le chercheur tranche explicitement le litige (#274). Iso Nitro. */
export async function confirmDisputeResolution(conversationId: string, confirmed: boolean): Promise<ConfirmDisputeResolutionResult> {
  const order = await getRawEscrowOrder(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'disputed') return { ok: false, error: 'invalid_status' }
  if (order.disputeResponse === null) return { ok: false, error: 'awaiting_provider_response' }

  const updated = confirmed
    ? await releaseOrderFunds(order)
    : await resolveDisputeAgainstProvider(order, "Le chercheur a confirmé que la prestation n'est pas terminée.", 'systemMessages.disputeResolvedNotDone')
  return { ok: true, order: updated }
}
