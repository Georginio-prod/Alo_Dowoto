import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { manualRefundSchema } from '~~/server/utils/apiValidationAdmin'
import { adminManualRefund } from '~~/server/utils/adminPaymentActions'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Remboursement manuel d'un chercheur (#dashboard-admin, module 3) — crédit direct du portefeuille, motif obligatoire. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, manualRefundSchema)
  if (!body.amount) badRequest('Montant requis.')

  await adminManualRefund(id, body.amount, body.reason)
  await recordAuditLog({ actor: admin, action: 'client.manual_refund', targetType: 'user', targetId: id, metadata: { amount: body.amount, reason: body.reason } })
  return { ok: true }
})
