import { randomUUID } from 'node:crypto'
import { findPlan } from '~~/app/data/plans'
import { prisma } from '~~/server/utils/prisma'
import { creditWallet } from '~~/server/utils/walletStore'
import { cancelEscrowOrder, releaseOrderFunds, getRawEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { resolvePayment } from '~~/server/utils/paymentStore'
import { resolveRecharge } from '~~/server/utils/walletRechargeStore'
import { activateSubscription, getSubscriptionById } from '~~/server/utils/subscriptionStore'
import { rewardReferralIfPending } from '~~/server/utils/referralStore'

/**
 * Actions financières déclenchées depuis /admin (#dashboard-admin, modules
 * Chercheurs/Paiements & séquestre) — s'appuient sur les mêmes primitives que
 * le reste de l'application (walletStore, escrowOrderStore) pour ne jamais
 * dupliquer la logique de séquestre/portefeuille.
 */

/**
 * Remboursement manuel (geste commercial) : crédit direct du portefeuille du
 * chercheur, sans dépendre du statut d'une commande précise — contrairement
 * à `cancelEscrowOrder`, qui rembourse une commande active identifiée.
 */
export async function adminManualRefund(clientId: string, amount: number, reason: string): Promise<void> {
  await creditWallet({ walletUserId: clientId, type: 'escrow_refund', amount, reference: `admin-manual-${randomUUID()}`, counterpartyUserId: null })
  void reason
}

export type ReleaseFundsResult = { ok: true } | { ok: false, error: 'not_found' | 'invalid_status' }

/** Libère manuellement les fonds d'une commande en séquestre (#dashboard-admin, module Paiements) — même logique que la validation normale. */
export async function adminReleaseFunds(escrowOrderId: string): Promise<ReleaseFundsResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { id: escrowOrderId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'in_escrow' && row.status !== 'delivered') return { ok: false, error: 'invalid_status' }
  const order = await getRawEscrowOrder(row.conversationId)
  if (!order) return { ok: false, error: 'not_found' }
  await releaseOrderFunds(order)
  return { ok: true }
}

export type RetryTransactionResult = { ok: true } | { ok: false, error: 'not_found' | 'not_failed' }

/**
 * Rejoue une transaction échouée (#dashboard-admin, module Paiements) — force
 * la même résolution « succès » qu'un webhook opérateur réel, avec les mêmes
 * effets de bord (activation d'abonnement, bonus de parrainage). `kind`
 * distingue un paiement d'abonnement d'une recharge de portefeuille, deux
 * tables distinctes.
 */
export async function adminRetryTransaction(kind: 'subscription_payment' | 'wallet_recharge', id: string): Promise<RetryTransactionResult> {
  if (kind === 'subscription_payment') {
    const payment = await prisma.payment.findUnique({ where: { id } })
    if (!payment) return { ok: false, error: 'not_found' }
    if (payment.status !== 'failed') return { ok: false, error: 'not_failed' }
    await prisma.payment.update({ where: { id }, data: { status: 'pending' } })
    const resolved = await resolvePayment(id, 'confirmed', payment.operatorRef ?? undefined)
    if (resolved?.status === 'confirmed') {
      const subscription = await getSubscriptionById(resolved.subscriptionId)
      const plan = subscription ? findPlan(subscription.plan) : undefined
      if (subscription && plan) await activateSubscription(subscription.id, plan.durationDays)
      await rewardReferralIfPending(resolved.userId)
    }
    return { ok: true }
  }

  const recharge = await prisma.walletRecharge.findUnique({ where: { id } })
  if (!recharge) return { ok: false, error: 'not_found' }
  if (recharge.status !== 'failed') return { ok: false, error: 'not_failed' }
  await prisma.walletRecharge.update({ where: { id }, data: { status: 'pending' } })
  await resolveRecharge(id, 'confirmed', recharge.operatorRef ?? undefined)
  return { ok: true }
}

export type RefundOrderResult = { ok: true } | { ok: false, error: 'not_found' | 'invalid_status' | 'reason_required' }

/** Rembourse totalement une commande en séquestre (#dashboard-admin, module Paiements) — même logique que l'annulation prestataire. */
export async function adminRefundOrder(escrowOrderId: string, reason: string): Promise<RefundOrderResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { id: escrowOrderId } })
  if (!row) return { ok: false, error: 'not_found' }
  const result = await cancelEscrowOrder(row.conversationId, reason)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true }
}
