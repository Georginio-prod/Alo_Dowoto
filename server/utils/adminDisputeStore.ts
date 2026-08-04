import { prisma } from '~~/server/utils/prisma'
import { creditWallet } from '~~/server/utils/walletStore'
import { releaseOrderFunds, getRawEscrowOrder, type EscrowOrder } from '~~/server/utils/escrowOrderStore'
import { addSystemMessage } from '~~/server/utils/conversationStore'
import { sendAdminMessage } from '~~/server/utils/adminMessaging'

/**
 * Médiation admin des litiges escrow (#dashboard-admin, module 6) — vient
 * s'ajouter au dénouement automatique existant (server/utils/escrowDisputeResolution.ts,
 * déclenché par timeout ou confirmation du chercheur) : ici, c'est l'équipe
 * WorkTogo qui tranche explicitement, y compris avec un partage du montant.
 * Chaque décision est tracée par le journal d'audit (server/utils/auditLog.ts),
 * appelé par la route qui invoque ces fonctions.
 */

export interface AdminDisputeSummary {
  id: string
  clientId: string
  providerId: string
  amount: number
  disputedAt: number | null
  disputeReason: string | null
  disputeResponse: string | null
}

/** Litiges ouverts, les plus anciens en premier (ancienneté = urgence). */
export async function listAdminDisputes(): Promise<AdminDisputeSummary[]> {
  const rows = await prisma.escrowOrder.findMany({ where: { status: 'disputed' }, orderBy: { disputedAt: 'asc' } })
  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    providerId: row.providerId,
    amount: row.amount,
    disputedAt: row.disputedAt?.getTime() ?? null,
    disputeReason: row.disputeReason,
    disputeResponse: row.disputeResponse,
  }))
}

export type AdminDisputeOutcome = 'client' | 'provider' | 'split'

export type ResolveDisputeResult = { ok: true } | { ok: false, error: 'not_found' | 'invalid_status' }

/**
 * Tranche un litige : `provider` libère l'intégralité (commission standard
 * appliquée, comme une validation normale) ; `client` rembourse
 * l'intégralité (aucune commission, comme une annulation) ; `split` partage
 * selon `providerSharePercent` (0-100), sans commission — simplification
 * documentée pour un arbitrage manuel, distinct du calcul automatique.
 */
export async function adminResolveDispute(
  orderId: string,
  outcome: AdminDisputeOutcome,
  providerSharePercent: number | undefined,
  note: string,
): Promise<ResolveDisputeResult> {
  const row = await prisma.escrowOrder.findUnique({ where: { id: orderId } })
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'disputed') return { ok: false, error: 'invalid_status' }

  if (outcome === 'provider') {
    const order = await getRawEscrowOrder(row.conversationId)
    if (order) await releaseOrderFunds(order)
  } else if (outcome === 'client') {
    await prisma.$transaction(async (tx) => {
      await creditWallet({ walletUserId: row.clientId, type: 'escrow_refund', amount: row.amount, reference: row.id, counterpartyUserId: row.providerId }, tx)
      await tx.escrowOrder.update({ where: { id: row.id }, data: { status: 'refunded', cancelledAt: new Date(), cancelReason: `Litige tranché par l'équipe WorkTogo en faveur du chercheur. ${note}`.trim() } })
    })
  } else {
    const percent = Math.min(100, Math.max(0, providerSharePercent ?? 50))
    const providerShare = Math.round(row.amount * (percent / 100))
    const clientShare = row.amount - providerShare
    await prisma.$transaction(async (tx) => {
      if (providerShare > 0) await creditWallet({ walletUserId: row.providerId, type: 'escrow_release', amount: providerShare, reference: row.id, counterpartyUserId: row.clientId }, tx)
      if (clientShare > 0) await creditWallet({ walletUserId: row.clientId, type: 'escrow_refund', amount: clientShare, reference: row.id, counterpartyUserId: row.providerId }, tx)
      await tx.escrowOrder.update({ where: { id: row.id }, data: { status: 'refunded', cancelledAt: new Date(), cancelReason: `Litige partagé par l'équipe WorkTogo : ${percent}% au prestataire. ${note}`.trim() } })
    })
  }

  const outcomeLabel = outcome === 'provider' ? 'en faveur du prestataire' : outcome === 'client' ? 'en faveur du chercheur' : 'avec partage du montant'
  await addSystemMessage(row.conversationId, `Litige tranché par l'équipe WorkTogo ${outcomeLabel}.${note ? ` ${note}` : ''}`, 'text')

  return { ok: true }
}

/** Demande une preuve complémentaire aux deux parties (#dashboard-admin, module 6) — notification in-app. */
export async function requestAdditionalEvidence(orderId: string): Promise<{ ok: true } | { ok: false, error: 'not_found' }> {
  const row = await prisma.escrowOrder.findUnique({ where: { id: orderId } })
  if (!row) return { ok: false, error: 'not_found' }
  const title = 'Litige en médiation'
  const body = "L'équipe WorkTogo a besoin de preuves complémentaires pour trancher ce litige. Merci de répondre dans la conversation."
  await Promise.all([sendAdminMessage(row.clientId, title, body), sendAdminMessage(row.providerId, title, body)])
  return { ok: true }
}

export type { EscrowOrder }
