import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { adminResolveDispute } from '~~/server/utils/adminDisputeStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const resolveSchema = z.object({
  outcome: z.enum(['client', 'provider', 'split'], { error: 'Décision invalide.' }),
  providerSharePercent: z.number().min(0).max(100).optional(),
  note: z.string().trim().optional(),
})

/** Tranche un litige (#dashboard-admin, module 6) — décision tracée avec auteur et date via le journal d'audit. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, resolveSchema)

  const result = await adminResolveDispute(id, body.outcome, body.providerSharePercent, body.note ?? '')
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Litige introuvable.' : "Ce litige n'est plus ouvert.")
  await recordAuditLog({ actor: admin, action: 'dispute.resolve', targetType: 'escrow_order', targetId: id, metadata: { outcome: body.outcome, providerSharePercent: body.providerSharePercent, note: body.note } })
  return { ok: true }
})
