import { addSystemMessage } from '~~/server/utils/conversationStore'
import { getRawEscrowOrder, releaseOrderFunds, type EscrowOrder } from '~~/server/utils/escrowOrderStore'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet, debitWalletForPenalty } from '~~/server/utils/walletStore'

/**
 * Dénouement d'un litige (#274) une fois que le prestataire y a répondu (voir
 * `respondToDispute` dans escrowOrderStore.ts, qui notifie le chercheur) :
 *  - le chercheur confirme que la prestation est bien réalisée → les fonds
 *    sont libérés au prestataire, comme une validation normale.
 *  - le chercheur indique explicitement que ce n'est pas fait, OU ne répond
 *    pas dans le délai imparti (`DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS`)
 *    → remboursement intégral du chercheur, et le prestataire est pénalisé
 *    (`PROVIDER_DISPUTE_PENALTY_RATE` de la commande, plafonné à son solde
 *    disponible) — une compensation équivalente est versée au chercheur.
 *
 * Extrait d'escrowOrderStore.ts pour rester sous la limite de lignes par
 * fichier ; `applyDisputeResolutionTimeoutIfExpired` y est réimportée pour la
 * brancher dans la chaîne de vérifications paresseuses de
 * `getEscrowOrderByConversationId`.
 */

/** Part de la commande retenue au prestataire quand un litige se résout en sa défaveur. */
export const PROVIDER_DISPUTE_PENALTY_RATE = 0.15

/** Délai laissé au chercheur pour confirmer après la réponse du prestataire : passé ce délai, le litige se résout automatiquement en défaveur du prestataire. */
export const DISPUTE_RESOLUTION_CONFIRMATION_DELAY_MS = 48 * 60 * 60 * 1000

async function resolveDisputeAgainstProvider(
  order: EscrowOrder,
  outcomeMessage: string,
  translationKey: 'systemMessages.disputeResolvedTimeout' | 'systemMessages.disputeResolvedNotDone',
): Promise<EscrowOrder> {
  await creditWallet({ walletUserId: order.clientId, type: 'escrow_refund', amount: order.amount, reference: order.id, counterpartyUserId: order.providerId })

  const penalty = await debitWalletForPenalty({
    walletUserId: order.providerId,
    amount: Math.round(order.amount * PROVIDER_DISPUTE_PENALTY_RATE),
    reference: order.id,
    counterpartyUserId: order.clientId,
  })
  if (penalty && penalty.amount > 0) {
    await creditWallet({ walletUserId: order.clientId, type: 'dispute_compensation', amount: penalty.amount, reference: order.id, counterpartyUserId: order.providerId })
  }

  const now = Date.now()
  const cancelReason = `Litige résolu en défaveur du prestataire : ${outcomeMessage}`
  await prisma.escrowOrder.update({ where: { id: order.id }, data: { status: 'refunded', cancelledAt: new Date(now), cancelReason } })
  await addSystemMessage(
    order.conversationId,
    `${outcomeMessage} Remboursement intégral effectué au chercheur, et une pénalité a été appliquée au prestataire.`,
    'text',
    { key: translationKey },
  )

  return { ...order, status: 'refunded', cancelledAt: now, cancelReason }
}

/**
 * Passé le délai de confirmation après la réponse du prestataire à un litige,
 * un chercheur qui ne s'est pas prononcé est considéré comme n'ayant pas
 * validé — contrairement à la validation tacite (#195), ici le silence ne
 * profite pas au prestataire puisque c'est justement sa version qui est
 * contestée. Appelée depuis `getEscrowOrderByConversationId`.
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

export type ConfirmDisputeResolutionResult =
  | { ok: true; order: EscrowOrder }
  | { ok: false; error: 'not_found' | 'invalid_status' | 'awaiting_provider_response' }

/**
 * Le chercheur tranche explicitement le litige (nouveau bouton du panneau de
 * médiation) : `confirmed: true` si la prestation est bien réalisée, `false`
 * sinon.
 */
export async function confirmDisputeResolution(conversationId: string, confirmed: boolean): Promise<ConfirmDisputeResolutionResult> {
  const order = await getRawEscrowOrder(conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  if (order.status !== 'disputed') return { ok: false, error: 'invalid_status' }
  if (order.disputeResponse === null) return { ok: false, error: 'awaiting_provider_response' }

  const updated = confirmed
    ? await releaseOrderFunds(order)
    : await resolveDisputeAgainstProvider(
        order,
        "Le chercheur a confirmé que la prestation n'est pas terminée.",
        'systemMessages.disputeResolvedNotDone',
      )
  return { ok: true, order: updated }
}
