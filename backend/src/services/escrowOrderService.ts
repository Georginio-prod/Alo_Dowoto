import {
  escrowOrderRepository,
  type CreateEscrowOrderInput,
  type EscrowOrder,
  type EscrowOrderStatus,
} from '../repositories/escrowOrderRepository'
import { PLATFORM_WALLET_USER_ID, walletMovementRepository } from '../repositories/walletMovementRepository'
import { addSystemMessage, getClientContact } from './conversationService'
import { applyAutoReassignmentIfExpired } from './escrowAutoReassignmentService'
import { applyDisputeResolutionTimeoutIfExpired } from './escrowDisputeResolutionService'
import { notificationService } from './notificationService'
import { referralService } from './referralService'

/**
 * Commandes en séquestre (#194/#195, epic #191), porté iso depuis
 * `server/utils/escrowOrderStore.ts` (ADR-0016). Machine à états :
 * awaiting_payment → in_escrow → delivered → released (double validation),
 * avec annulation prestataire (→ refunded), litige (→ disputed), et validation
 * tacite après 72h. L'accès Prisma vit dans `escrowOrderRepository` ; les
 * mouvements d'argent passent par `walletMovementRepository` — composés dans une
 * seule transaction atomique (#366) via `escrowOrderRepository.transaction`.
 */

export type { EscrowOrder, EscrowOrderStatus }

/** Commission WorkTogo prélevée à la libération des fonds (#191). */
export const ESCROW_COMMISSION_RATE = 0.1

/** Délai de validation tacite (#195) : 72h sans réponse du chercheur après livraison. */
export const TACIT_VALIDATION_DELAY_MS = 72 * 60 * 60 * 1000

/** Délai maximal laissé au prestataire pour confirmer la prise en charge après paiement (#289). */
export const PROVIDER_RESPONSE_TIMEOUT_MS = 30 * 60 * 1000

/** Nombre maximal de demandes non payées ouvertes simultanément par un chercheur (#280). */
export const MAX_SIMULTANEOUS_UNPAID_ORDERS = 2

/** Seuls `released`/`refunded` sont terminales et permettent une reprise (#266). */
const TERMINAL_STATUSES_ALLOWING_REBOOK: readonly EscrowOrderStatus[] = ['released', 'refunded']

/** Accès direct (sans les vérifications paresseuses de `getEscrowOrderByConversationId`), pour les modules extraits. */
export function getRawEscrowOrder(conversationId: string): Promise<EscrowOrder | null> {
  return escrowOrderRepository.findByConversationId(conversationId)
}

/** Horodatages de création des commandes de ce chercheur (#277, `evaluateOrderRisk`). */
export function getRecentOrderTimestampsForClient(clientId: string): Promise<number[]> {
  return escrowOrderRepository.recentTimestampsForClient(clientId)
}

/** Nombre de commandes `awaiting_payment` pour ce chercheur (#280). */
export function countUnpaidOrdersForClient(clientId: string): Promise<number> {
  return escrowOrderRepository.countUnpaidForClient(clientId)
}

/**
 * Idempotent tant que la commande existante est active (`awaiting_payment` à
 * `disputed`). Une fois terminale (`released`/`refunded`), un nouvel appel la
 * remplace par une toute nouvelle commande (reprise d'un prestataire, #266).
 * Iso Nitro.
 */
export async function createEscrowOrder(input: CreateEscrowOrderInput): Promise<EscrowOrder> {
  const existing = await escrowOrderRepository.findByConversationId(input.conversationId)
  if (existing && !TERMINAL_STATUSES_ALLOWING_REBOOK.includes(existing.status)) {
    return existing
  }
  // Conversation unique en base : une commande terminale est remplacée (même
  // sémantique que l'ancien `Map.set`, qui écrasait l'entrée précédente).
  if (existing) await escrowOrderRepository.deleteById(existing.id)
  return escrowOrderRepository.create(input)
}

/**
 * Libère les fonds : crédite le prestataire (net de commission) et la plateforme
 * (commission), puis marque la commande `released`. Idempotent (garde par
 * relecture du statut dans la transaction). Iso Nitro.
 */
export async function releaseOrderFunds(order: EscrowOrder): Promise<EscrowOrder> {
  const commission = Math.round(order.amount * ESCROW_COMMISSION_RATE)
  const providerNet = order.amount - commission

  const { updated, released } = await escrowOrderRepository.transaction(async (tx) => {
    const fresh = await escrowOrderRepository.findByIdIn(tx, order.id)
    if (!fresh || fresh.status === 'released' || fresh.status === 'refunded') {
      return { updated: fresh ?? order, released: false }
    }
    if (providerNet > 0) {
      await walletMovementRepository.credit({ walletUserId: order.providerId, type: 'escrow_release', amount: providerNet, reference: order.id, counterpartyUserId: order.clientId }, tx)
    }
    if (commission > 0) {
      await walletMovementRepository.credit({ walletUserId: PLATFORM_WALLET_USER_ID, type: 'commission', amount: commission, reference: order.id, counterpartyUserId: order.providerId }, tx)
    }
    const row = await escrowOrderRepository.update(order.id, { status: 'released', releasedAt: new Date(Date.now()) }, tx)
    return { updated: row, released: true }
  })

  // Validation finale (#264, anti-fuite) : coordonnées réelles révélées une seule
  // fois, hors transaction (message non monétaire), quand la libération a eu lieu.
  if (released) {
    const contact = await getClientContact(order.conversationId)
    if (contact) {
      const body = `Prestation validée : voici les coordonnées du chercheur pour la suite — ${contact}`
      await addSystemMessage(order.conversationId, body, 'text', { key: 'systemMessages.contactRevealed', params: { contact } })
    }
  }
  return updated
}

/** Libère automatiquement une commande livrée depuis plus de 72h sans réponse (#195). */
async function applyTacitValidationIfExpired(order: EscrowOrder): Promise<EscrowOrder> {
  if (order.status !== 'delivered' || order.deliveredAt === null) return order
  if (Date.now() - order.deliveredAt >= TACIT_VALIDATION_DELAY_MS) {
    return releaseOrderFunds(order)
  }
  return order
}

export async function getEscrowOrderByConversationId(conversationId: string): Promise<EscrowOrder | null> {
  const existing = await escrowOrderRepository.findByConversationId(conversationId)
  if (!existing) return null
  let order = existing
  order = await applyTacitValidationIfExpired(order)
  order = await applyAutoReassignmentIfExpired(order)
  order = await applyDisputeResolutionTimeoutIfExpired(order)
  return order
}

/** Une prestation a-t-elle déjà été validée (`released`) entre ce client et ce prestataire ? (#264). */
export async function hasReleasedOrderBetween(clientId: string, providerId: string): Promise<boolean> {
  const rows = await escrowOrderRepository.findByClientAndProvider(clientId, providerId)
  for (const row of rows) {
    const order = await applyTacitValidationIfExpired(row)
    if (order.status === 'released') return true
  }
  return false
}

export type PayEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'already_paid' | 'insufficient_funds' }

/** Débite le portefeuille du chercheur et met la commande en séquestre (#194). Iso Nitro. */
export async function payEscrowOrder(conversationId: string): Promise<PayEscrowOrderResult> {
  const row = await escrowOrderRepository.findByConversationId(conversationId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'awaiting_payment') return { ok: false, error: 'already_paid' }

  const result = await escrowOrderRepository.transaction(async (tx): Promise<
    { kind: 'ok'; order: EscrowOrder } | { kind: 'already_paid' } | { kind: 'insufficient_funds' }
  > => {
    const fresh = await escrowOrderRepository.findByIdIn(tx, row.id)
    if (!fresh || fresh.status !== 'awaiting_payment') return { kind: 'already_paid' }
    const movement = await walletMovementRepository.debit({ walletUserId: fresh.clientId, amount: fresh.amount, reference: fresh.id, counterpartyUserId: fresh.providerId }, tx)
    if (!movement) return { kind: 'insufficient_funds' }
    const order = await escrowOrderRepository.update(fresh.id, { status: 'in_escrow', paidAt: new Date(Date.now()) }, tx)
    return { kind: 'ok', order }
  })

  if (result.kind === 'already_paid') return { ok: false, error: 'already_paid' }
  if (result.kind === 'insufficient_funds') return { ok: false, error: 'insufficient_funds' }

  // Premier paiement réel du filleul (#365) : idempotent, non bloquant.
  await referralService.rewardReferralIfPending(row.clientId)

  return { ok: true, order: result.order }
}

export type MarkDeliveredResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'check_in_out_required' }

/** Formate l'échéance de validation tacite pour le message envoyé au chercheur (#273). */
function formatTacitValidationDeadline(deliveredAt: number): string {
  const deadline = new Date(deliveredAt + TACIT_VALIDATION_DELAY_MS)
  return deadline.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Le prestataire marque la prestation comme terminée (#195). Iso Nitro. */
export async function markEscrowOrderDelivered(conversationId: string): Promise<MarkDeliveredResult> {
  const row = await escrowOrderRepository.findByConversationId(conversationId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (row.checkInAt === null || row.checkOutAt === null) return { ok: false, error: 'check_in_out_required' }

  const deliveredAt = Date.now()
  const order = await escrowOrderRepository.update(row.id, { status: 'delivered', deliveredAt: new Date(deliveredAt) })

  const deadline = deliveredAt + TACIT_VALIDATION_DELAY_MS
  const warningBody = `Le prestataire a marqué la prestation comme terminée. Vous avez jusqu'au ${formatTacitValidationDeadline(deliveredAt)} pour confirmer la réception ou signaler un problème ; passé ce délai, le paiement sera automatiquement libéré au prestataire.`
  await addSystemMessage(conversationId, warningBody, 'text', { key: 'systemMessages.tacitValidationWarning', params: { deadline } })

  return { ok: true, order }
}

export type ConfirmReceiptResult = { ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }

/** Le chercheur confirme la réception/satisfaction (#195) : libère les fonds. Iso Nitro. */
export async function confirmEscrowOrderReceipt(conversationId: string): Promise<ConfirmReceiptResult> {
  const row = await escrowOrderRepository.findByConversationId(conversationId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'delivered') return { ok: false, error: 'invalid_status' }

  const order = await releaseOrderFunds(row)
  return { ok: true, order }
}

export type CancelEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/** Le prestataire annule après le débit du chercheur (#196) : remboursement intégral. Iso Nitro. */
export async function cancelEscrowOrder(conversationId: string, reason: string): Promise<CancelEscrowOrderResult> {
  const row = await escrowOrderRepository.findByConversationId(conversationId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow' && row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const order = await escrowOrderRepository.transaction(async (tx) => {
    const fresh = await escrowOrderRepository.findByIdIn(tx, row.id)
    if (!fresh || (fresh.status !== 'in_escrow' && fresh.status !== 'delivered')) return null
    await walletMovementRepository.credit({ walletUserId: fresh.clientId, type: 'escrow_refund', amount: fresh.amount, reference: fresh.id, counterpartyUserId: fresh.providerId }, tx)
    return escrowOrderRepository.update(fresh.id, { status: 'refunded', cancelledAt: new Date(Date.now()), cancelReason: reason.trim() }, tx)
  })
  if (!order) return { ok: false, error: 'invalid_status' }
  return { ok: true, order }
}

export type OpenDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/** Le chercheur conteste la qualité au lieu de confirmer (#197/#274) : gèle les fonds. Iso Nitro. */
export async function openEscrowDispute(conversationId: string, reason: string, evidence?: string): Promise<OpenDisputeResult> {
  const row = await escrowOrderRepository.findByConversationId(conversationId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const order = await escrowOrderRepository.update(row.id, {
    status: 'disputed',
    disputedAt: new Date(Date.now()),
    disputeReason: reason.trim(),
    disputeEvidence: evidence?.trim() || null,
  })
  return { ok: true, order }
}

export type RespondToDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'response_required' }

/** Le prestataire répond à un litige (#274) : reste `disputed`, marque le passage en médiation. Iso Nitro. */
export async function respondToDispute(conversationId: string, response: string): Promise<RespondToDisputeResult> {
  const row = await escrowOrderRepository.findByConversationId(conversationId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'disputed') return { ok: false, error: 'invalid_status' }
  if (!response.trim()) return { ok: false, error: 'response_required' }

  const order = await escrowOrderRepository.update(row.id, { disputeResponse: response.trim(), disputeRespondedAt: new Date(Date.now()) })

  await notificationService.notifyDisputeUpdate({
    recipientId: order.clientId,
    conversationId: order.conversationId,
    title: 'Réponse du prestataire à votre litige',
    body: "Le prestataire indique que la prestation est terminée. Merci de confirmer si c'est bien le cas.",
  })

  return { ok: true, order }
}

/** Commandes en litige en attente d'arbitrage (#197/#274). */
export function listDisputedOrders(): Promise<EscrowOrder[]> {
  return escrowOrderRepository.listDisputed()
}

export type AdminReassignResult = { ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }

/** Réassigne une commande bloquée (#dashboard-admin) — seulement avant livraison. Iso Nitro. */
export async function adminReassignOrder(orderId: string, newProviderId: string): Promise<AdminReassignResult> {
  const row = await escrowOrderRepository.findById(orderId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'awaiting_payment' && row.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  const updated = await escrowOrderRepository.update(orderId, { providerId: newProviderId })
  return { ok: true, order: updated }
}

/** Force la validation (libération) d'une commande bloquée (#dashboard-admin). Iso Nitro. */
export async function adminForceValidate(orderId: string): Promise<{ ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }> {
  const row = await escrowOrderRepository.findById(orderId)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow' && row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  const order = await releaseOrderFunds(row)
  return { ok: true, order }
}
