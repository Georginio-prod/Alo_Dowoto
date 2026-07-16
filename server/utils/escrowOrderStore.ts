import { randomUUID } from 'node:crypto'
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
 * (#195, double validation). `delivered` déclenche un délai de validation
 * tacite (`TACIT_VALIDATION_DELAY_MS`) : si le chercheur ne confirme ni ne
 * conteste dans ce délai, la commande est libérée automatiquement à la
 * prochaine lecture (voir `applyTacitValidationIfExpired`) — pas de tâche
 * planifiée nécessaire tant que le processus reste unique (prototype en
 * mémoire).
 */

export type EscrowOrderStatus = 'awaiting_payment' | 'in_escrow' | 'delivered' | 'released'

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
