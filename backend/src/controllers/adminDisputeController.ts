import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { auditLogService } from '../services/auditLogService'
import {
  adminResolveDispute as resolveDisputeService,
  listAdminDisputes,
  requestAdditionalEvidence,
} from '../services/adminDisputeService'
import type { disputeResolveSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : médiation des litiges (module 6).
 * Portées iso depuis `server/api/admin/disputes/**` (ADR-0017). Rôle admin,
 * décisions tracées au journal d'audit.
 */

/** GET /api/admin/disputes — file d'attente des litiges ouverts. */
export async function adminListDisputes(_req: Request, res: Response): Promise<void> {
  res.json({ disputes: await listAdminDisputes() })
}

/** POST /api/admin/disputes/:id/resolve — tranche un litige (client/provider/split). */
export async function adminResolveDispute(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof disputeResolveSchema>

  const result = await resolveDisputeService(id, body.outcome, body.providerSharePercent, body.note ?? '')
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Litige introuvable.' : "Ce litige n'est plus ouvert.")
  await auditLogService.recordAuditLog({ actor: admin, action: 'dispute.resolve', targetType: 'escrow_order', targetId: id, metadata: { outcome: body.outcome, providerSharePercent: body.providerSharePercent, note: body.note } })
  res.json({ ok: true })
}

/** POST /api/admin/disputes/:id/request-evidence — demande des preuves aux deux parties. */
export async function adminRequestEvidence(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const result = await requestAdditionalEvidence(id)
  if (!result.ok) notFound('Litige introuvable.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'dispute.request_evidence', targetType: 'escrow_order', targetId: id })
  res.json({ ok: true })
}
