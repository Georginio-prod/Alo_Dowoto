import { type EscrowOrder, getRawEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

/**
 * Grille d'annulation symétrique (#275). Le prestataire annule toujours sans
 * pénalité pour le chercheur (voir `cancelEscrowOrder`, escrowOrderStore.ts)
 * — c'était déjà le cas. Ce qui manquait : quand c'est le *chercheur* qui
 * annule après avoir payé, rien n'indemnisait le prestataire qui s'était
 * rendu disponible. Délai de grâce : annulation sans pénalité si elle
 * intervient dans les 2h suivant le paiement (le prestataire n'a pas encore
 * eu le temps de s'organiser). Passé ce délai, une part du montant reste
 * acquise au prestataire à titre d'indemnisation, le solde est remboursé au
 * chercheur.
 *
 * Extrait dans son propre fichier (plutôt que dans escrowOrderStore.ts) pour
 * rester sous la limite ESLint `max-lines` (300) — utilise `getRawEscrowOrder`
 * (accès direct, sans les vérifications paresseuses de validation tacite/
 * réattribution automatique, non pertinentes pour une commande `in_escrow`
 * fraîchement payée) plutôt que la carte interne du store.
 */

export const CLIENT_CANCELLATION_GRACE_PERIOD_MS = 2 * 60 * 60 * 1000
export const CLIENT_LATE_CANCELLATION_PENALTY_RATE = 0.2

export type CancelByClientResult =
  | { ok: true; order: EscrowOrder; providerCompensation: number }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le chercheur annule après avoir payé, avant que la prestation soit
 * marquée terminée (#275, grille d'annulation symétrique — pendant de
 * `cancelEscrowOrder` côté prestataire). Autorisé uniquement tant que la
 * commande est en séquestre (`in_escrow`) : une fois `delivered`, le
 * désaccord relève du litige (`openEscrowDispute`), pas de l'annulation.
 */
export function cancelEscrowOrderByClient(conversationId: string, reason: string): CancelByClientResult {
  const order = getRawEscrowOrder(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const isWithinGracePeriod = order.paidAt !== null && Date.now() - order.paidAt < CLIENT_CANCELLATION_GRACE_PERIOD_MS
  const providerCompensation = isWithinGracePeriod ? 0 : Math.round(order.amount * CLIENT_LATE_CANCELLATION_PENALTY_RATE)
  const clientRefund = order.amount - providerCompensation

  if (providerCompensation > 0) {
    creditWallet({
      walletUserId: order.providerId,
      type: 'cancellation_compensation',
      amount: providerCompensation,
      reference: order.id,
      counterpartyUserId: order.clientId,
    })
  }
  if (clientRefund > 0) {
    creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: clientRefund, reference: order.id, counterpartyUserId: order.providerId })
  }

  order.status = 'refunded'
  order.cancelledAt = Date.now()
  order.cancelReason = reason.trim()
  return { ok: true, order, providerCompensation }
}
