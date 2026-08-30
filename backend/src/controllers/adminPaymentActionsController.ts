import type { Request, Response } from 'express'
import type { z } from 'zod'
import { prisma } from '../config/prisma'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { paymentService } from '../services/paymentService'
import { adminManualRefund, adminRefundOrder, adminReleaseFunds, adminRetryTransaction } from '../services/adminPaymentActionsService'
import { auditLogService } from '../services/auditLogService'
import type { manualRefundSchema, reasonBodySchema, retryTransactionSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : actions MUTANTES sur les paiements et
 * le séquestre. Portées iso depuis `server/api/admin/payments/[id]/**`
 * (ADR-0017). `fail` nettoie un paiement Mobile Money abandonné (jamais de
 * « confirmation » manuelle) ; refund/release/retry s'appuient sur les
 * primitives financières partagées (`adminPaymentActionsService`).
 */

/** POST /api/admin/payments/:id/fail — marque un paiement EN ATTENTE comme échoué (payments.manage). */
export async function adminPaymentFail(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant de paiement manquant.')

  const existing = await prisma.payment.findUnique({ where: { id }, select: { status: true } })
  if (!existing) notFound('Paiement introuvable.')
  if (existing.status !== 'pending') badRequest('Seul un paiement en attente peut être marqué comme échoué.')

  const payment = await paymentService.resolvePayment(id, 'failed', 'admin-manuel')
  res.json({ ok: true, status: payment?.status ?? 'failed' })
}

/** POST /api/admin/payments/:id/refund — remboursement total d'une commande en séquestre (rôle admin, tracé). `id` = commande. */
export async function adminPaymentRefund(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof reasonBodySchema>

  const result = await adminRefundOrder(id, body.reason)
  if (!result.ok) badRequest('Statut incompatible avec le remboursement.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'payment.refund', targetType: 'escrow_order', targetId: id, metadata: { reason: body.reason } })
  res.json({ ok: true })
}

/** POST /api/admin/payments/:id/release — libère manuellement les fonds séquestrés (rôle admin, tracé). `id` = commande. */
export async function adminPaymentRelease(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const result = await adminReleaseFunds(id)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Commande introuvable.' : 'Statut incompatible avec la libération.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'payment.release', targetType: 'escrow_order', targetId: id })
  res.json({ ok: true })
}

/** POST /api/admin/payments/:id/retry — rejoue une transaction échouée (abonnement ou recharge) (rôle admin, tracé). */
export async function adminPaymentRetry(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof retryTransactionSchema>

  const result = await adminRetryTransaction(body.kind, id)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Transaction introuvable.' : 'Seule une transaction échouée peut être rejouée.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'payment.retry', targetType: body.kind, targetId: id })
  res.json({ ok: true })
}

/** POST /api/admin/clients/:id/refund — remboursement manuel d'un chercheur, crédit direct (rôle admin, tracé). */
export async function adminClientRefund(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof manualRefundSchema>
  if (!body.amount) badRequest('Montant requis.')

  await adminManualRefund(id, body.amount, body.reason)
  await auditLogService.recordAuditLog({ actor: admin, action: 'client.manual_refund', targetType: 'user', targetId: id, metadata: { amount: body.amount, reason: body.reason } })
  res.json({ ok: true })
}
