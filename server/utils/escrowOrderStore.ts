import { randomUUID } from 'node:crypto'
import { addSystemMessage, getClientContact } from '~~/server/utils/conversationStore'
import { creditWallet, debitWallet, PLATFORM_WALLET_USER_ID } from '~~/server/utils/walletStore'

/**
 * Store en mémoire pour les commandes en séquestre (#194/#195, brique du
 * système de paiement séquestre — voir l'epic #191). Même limite que les
 * autres stores (pas de base de données encore en place, voir #45/#46).
 *
 * Une commande est créée en même temps que la prise de premier contact
 * (#129) est soumise, avec le tarif fixe du prestataire (`resolveProviderRate`,
 * server/utils/providerDirectory.ts — cette itération ne gère que le tarif
 * fixe affiché, pas le devis à valider, voir #194). Tant qu'elle n'est pas
 * payée, le prestataire ne doit voir ni le message ni le détail de la
 * demande (voir server/api/conversations/[id]/messages.get.ts).
 *
 * Cycle de vie : awaiting_payment → in_escrow (#194) → delivered → released
 * (#195, double validation) ; le prestataire peut aussi annuler après le
 * débit (in_escrow ou delivered) → refunded (#196, remboursement intégral
 * et automatique, motif obligatoire). `delivered` déclenche un délai de
 * validation tacite (`TACIT_VALIDATION_DELAY_MS`) : si le chercheur ne
 * confirme ni ne conteste dans ce délai, la commande est libérée
 * automatiquement à la prochaine lecture (voir `applyTacitValidationIfExpired`)
 * — pas de tâche planifiée nécessaire tant que le processus reste unique
 * (prototype en mémoire). Le chercheur peut aussi, à la place de confirmer,
 * ouvrir un litige (#197) : `delivered` → `disputed`, ce qui gèle les fonds
 * (ni libération ni remboursement automatique) et interrompt la validation
 * tacite, en attendant l'arbitrage d'une équipe de médiation WorkTogo.
 */

export type EscrowOrderStatus = 'awaiting_payment' | 'in_escrow' | 'delivered' | 'released' | 'refunded' | 'disputed'

export interface EscrowOrder {
  id: string
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  status: EscrowOrderStatus
  createdAt: number
  paidAt: number | null
  deliveredAt: number | null
  releasedAt: number | null
  cancelledAt: number | null
  /** Motif obligatoire de l'annulation prestataire (#196), à des fins de modération/fiabilité. */
  cancelReason: string | null
  disputedAt: number | null
  /** Motif du litige ouvert par le chercheur (#197), transmis à l'équipe de médiation. */
  disputeReason: string | null
}

/**
 * Commission WorkTogo prélevée à la libération des fonds (pas à la mise en
 * séquestre), politique par défaut à valider avec l'équipe produit (#191).
 */
export const ESCROW_COMMISSION_RATE = 0.1

/** Délai de validation tacite (#195) : 72h sans réponse du chercheur après livraison. */
export const TACIT_VALIDATION_DELAY_MS = 72 * 60 * 60 * 1000

const ordersByConversationId = new Map<string, EscrowOrder>()

/** Idempotent : une conversation n'a jamais plus d'une commande active à la fois. */
export function createEscrowOrder(input: {
  conversationId: string
  clientId: string
  providerId: string
  amount: number
}): EscrowOrder {
  const existing = ordersByConversationId.get(input.conversationId)
  if (existing) return existing

  const order: EscrowOrder = {
    id: randomUUID(),
    conversationId: input.conversationId,
    clientId: input.clientId,
    providerId: input.providerId,
    amount: input.amount,
    status: 'awaiting_payment',
    createdAt: Date.now(),
    paidAt: null,
    deliveredAt: null,
    releasedAt: null,
    cancelledAt: null,
    cancelReason: null,
    disputedAt: null,
    disputeReason: null,
  }
  ordersByConversationId.set(input.conversationId, order)
  return order
}

/**
 * Effectue la libération des fonds : crédite le prestataire (net de
 * commission) et la plateforme (commission), puis marque la commande
 * `released`. Appelée aussi bien par la confirmation explicite du chercheur
 * que par la validation tacite après 72h — jamais deux fois pour la même
 * commande (le statut `delivered` requis n'existe plus une fois libérée).
 */
function releaseOrderFunds(order: EscrowOrder): void {
  const commission = Math.round(order.amount * ESCROW_COMMISSION_RATE)
  const providerNet = order.amount - commission

  if (providerNet > 0) {
    creditWallet({ walletUserId: order.providerId, type: 'escrow_release', amount: providerNet, reference: order.id, counterpartyUserId: order.clientId })
  }
  if (commission > 0) {
    creditWallet({ walletUserId: PLATFORM_WALLET_USER_ID, type: 'commission', amount: commission, reference: order.id, counterpartyUserId: order.providerId })
  }

  order.status = 'released'
  order.releasedAt = Date.now()

  // Validation finale (#264, anti-fuite) : les coordonnées réelles du
  // chercheur, masquées jusqu'ici dans le fil, ne sont révélées au
  // prestataire qu'une fois la prestation intégralement validée et payée.
  const contact = getClientContact(order.conversationId)
  if (contact) {
    addSystemMessage(
      order.conversationId,
      `Prestation validée : voici les coordonnées du chercheur pour la suite — ${contact}`,
    )
  }
}

/** Libère automatiquement une commande livrée depuis plus de 72h sans réponse du chercheur (#195). */
function applyTacitValidationIfExpired(order: EscrowOrder): void {
  if (order.status !== 'delivered' || order.deliveredAt === null) return
  if (Date.now() - order.deliveredAt >= TACIT_VALIDATION_DELAY_MS) {
    releaseOrderFunds(order)
  }
}

export function getEscrowOrderByConversationId(conversationId: string): EscrowOrder | null {
  const order = ordersByConversationId.get(conversationId) ?? null
  if (order) applyTacitValidationIfExpired(order)
  return order
}

/**
 * Une prestation a-t-elle déjà été intégralement validée (`released`) entre
 * ce client et ce prestataire ? Sert de condition au démasquage des
 * coordonnées sur la fiche prestataire (#264, anti-fuite) — remplace l'ancien
 * critère « conversation existante », trop précoce (démasquait dès le
 * premier contact, avant tout paiement).
 */
export function hasReleasedOrderBetween(clientId: string, providerId: string): boolean {
  for (const order of ordersByConversationId.values()) {
    if (order.clientId !== clientId || order.providerId !== providerId) continue
    applyTacitValidationIfExpired(order)
    if (order.status === 'released') return true
  }
  return false
}

export type PayEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'already_paid' | 'insufficient_funds' }

/**
 * Débite le portefeuille du chercheur et met la commande en séquestre.
 * Ne renvoie jamais d'erreur générique : l'appelant (route API) sait
 * exactement quel code HTTP renvoyer selon le motif.
 */
export function payEscrowOrder(conversationId: string): PayEscrowOrderResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'awaiting_payment') return { ok: false, error: 'already_paid' }

  const movement = debitWallet({ walletUserId: order.clientId, amount: order.amount, reference: order.id, counterpartyUserId: order.providerId })
  if (!movement) return { ok: false, error: 'insufficient_funds' }

  order.status = 'in_escrow'
  order.paidAt = Date.now()
  return { ok: true, order }
}

export type MarkDeliveredResult = { ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }

/** Le prestataire marque la prestation comme terminée (#195, « Marquer comme terminé »). */
export function markEscrowOrderDelivered(conversationId: string): MarkDeliveredResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }

  order.status = 'delivered'
  order.deliveredAt = Date.now()
  return { ok: true, order }
}

export type ConfirmReceiptResult = { ok: true; order: EscrowOrder } | { ok: false; error: 'not_found' | 'invalid_status' }

/** Le chercheur confirme la réception/satisfaction (#195) : libère les fonds vers le prestataire. */
export function confirmEscrowOrderReceipt(conversationId: string): ConfirmReceiptResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'delivered') return { ok: false, error: 'invalid_status' }

  releaseOrderFunds(order)
  return { ok: true, order }
}

export type CancelEscrowOrderResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le prestataire annule après le débit du chercheur (#196) : remboursement
 * intégral et automatique, aucune commission prélevée. Autorisé tant que la
 * commande est en séquestre ou livrée mais pas encore validée (`in_escrow`
 * ou `delivered`) — plus possible une fois les fonds libérés (`released`).
 * Le motif est obligatoire, à des fins de modération et de statistiques de
 * fiabilité du prestataire.
 */
export function cancelEscrowOrder(conversationId: string, reason: string): CancelEscrowOrderResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow' && order.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId })

  order.status = 'refunded'
  order.cancelledAt = Date.now()
  order.cancelReason = reason.trim()
  return { ok: true, order }
}

export type OpenDisputeResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le chercheur conteste la qualité de la prestation au lieu de confirmer la
 * réception (#197) : gèle les fonds (aucune libération ni remboursement
 * automatique) et notifie une équipe de médiation WorkTogo. Seule une
 * commande `delivered` (prestation marquée terminée par le prestataire, en
 * attente de validation) peut être contestée — passé ce point, le litige
 * relève de la médiation, pas de cette route.
 */
export function openEscrowDispute(conversationId: string, reason: string): OpenDisputeResult {
  const order = ordersByConversationId.get(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  order.status = 'disputed'
  order.disputedAt = Date.now()
  order.disputeReason = reason.trim()
  return { ok: true, order }
}

/** Commandes en litige en attente d'arbitrage, pour une future interface de médiation WorkTogo (#197). */
export function listDisputedOrders(): EscrowOrder[] {
  return [...ordersByConversationId.values()].filter((order) => order.status === 'disputed')
}
