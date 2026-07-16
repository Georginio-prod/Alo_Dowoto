import { randomUUID } from 'node:crypto'
import { debitWallet } from '~~/server/utils/walletStore'

/**
 * Store en mémoire pour les commandes en séquestre (#194, brique du système
 * de paiement séquestre — voir l'epic #191). Même limite que les autres
 * stores (pas de base de données encore en place, voir #45/#46).
 *
 * Une commande est créée en même temps que la prise de premier contact
 * (#129) est soumise, avec le tarif fixe du prestataire (`resolveProviderRate`,
 * server/utils/providerDirectory.ts — cette itération ne gère que le tarif
 * fixe affiché, pas le devis à valider, voir #194). Tant qu'elle n'est pas
 * payée, le prestataire ne doit voir ni le message ni le détail de la
 * demande (voir server/api/conversations/[id]/messages.get.ts).
 */

export type EscrowOrderStatus = 'awaiting_payment' | 'in_escrow'

export interface EscrowOrder {
  id: string
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  status: EscrowOrderStatus
  createdAt: number
  paidAt: number | null
}

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
  }
  ordersByConversationId.set(input.conversationId, order)
  return order
}

export function getEscrowOrderByConversationId(conversationId: string): EscrowOrder | null {
  return ordersByConversationId.get(conversationId) ?? null
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
