import { type EscrowOrder, getRawEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet } from '~~/server/utils/walletStore'

/**
 * Grille d'annulation symétrique (#275). Le prestataire annule toujours sans
 * pénalité pour le chercheur (voir `cancelEscrowOrder`, escrowOrderStore.ts).
 * Ce qui manquait : quand c'est le *chercheur* qui annule après avoir payé,
 * rien n'indemnisait le prestataire qui s'était rendu disponible. Délai de
 * grâce : annulation sans pénalité si elle intervient dans les 2h suivant le
 * paiement. Passé ce délai, une part du montant reste acquise au prestataire à
 * titre d'indemnisation, le solde est remboursé au chercheur.
 *
 * Extrait dans son propre fichier (limite ESLint `max-lines`) — utilise
 * `getRawEscrowOrder` (accès direct, sans les vérifications paresseuses de
 * validation tacite/réattribution, non pertinentes pour une commande
 * `in_escrow` fraîchement payée). Depuis #342 (ADR 0013), la commande est
 * persistée : la mise à jour passe par `prisma.escrowOrder.update`.
 */

export const CLIENT_CANCELLATION_GRACE_PERIOD_MS = 2 * 60 * 60 * 1000
export const CLIENT_LATE_CANCELLATION_PENALTY_RATE = 0.2

export type CancelByClientResult =
  | { ok: true; order: EscrowOrder; providerCompensation: number }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'reason_required' }

/**
 * Le chercheur annule après avoir payé, avant que la prestation soit marquée
 * terminée (#275). Autorisé uniquement tant que la commande est en séquestre
 * (`in_escrow`) : une fois `delivered`, le désaccord relève du litige.
 */
export async function cancelEscrowOrderByClient(conversationId: string, reason: string): Promise<CancelByClientResult> {
  const order = await getRawEscrowOrder(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'in_escrow') return { ok: false, error: 'invalid_status' }
  if (!reason.trim()) return { ok: false, error: 'reason_required' }

  const isWithinGracePeriod = order.paidAt !== null && Date.now() - order.paidAt < CLIENT_CANCELLATION_GRACE_PERIOD_MS
  const providerCompensation = isWithinGracePeriod ? 0 : Math.round(order.amount * CLIENT_LATE_CANCELLATION_PENALTY_RATE)
  const clientRefund = order.amount - providerCompensation

  if (providerCompensation > 0) {
    await creditWallet({
      walletUserId: order.providerId,
      type: 'cancellation_compensation',
      amount: providerCompensation,
      reference: order.id,
      counterpartyUserId: order.clientId,
    })
  }
  if (clientRefund > 0) {
    await creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: clientRefund, reference: order.id, counterpartyUserId: order.providerId })
  }

  const now = Date.now()
  await prisma.escrowOrder.update({
    where: { id: order.id },
    data: { status: 'refunded', cancelledAt: new Date(now), cancelReason: reason.trim() },
  })
  return { ok: true, order: { ...order, status: 'refunded', cancelledAt: now, cancelReason: reason.trim() }, providerCompensation }
}
