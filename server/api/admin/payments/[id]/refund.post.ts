import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { reasonBodySchema } from '~~/server/utils/apiValidationAdmin'
import { adminRefundOrder } from '~~/server/utils/adminPaymentActions'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Déclenche un remboursement total d'une commande en séquestre (#dashboard-admin, module 5). `id` = identifiant de la commande. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, reasonBodySchema)

  const result = await adminRefundOrder(id, body.reason)
  if (!result.ok) badRequest('Statut incompatible avec le remboursement.')
  await recordAuditLog({ actor: admin, action: 'payment.refund', targetType: 'escrow_order', targetId: id, metadata: { reason: body.reason } })
  return { ok: true }
})
