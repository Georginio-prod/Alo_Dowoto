import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { reasonBodySchema } from '~~/server/utils/apiValidationAdmin'
import { adminRefundOrder } from '~~/server/utils/adminPaymentActions'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Annule une mission (remboursement intégral du chercheur), motif obligatoire (#dashboard-admin, module 4). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, reasonBodySchema)

  const result = await adminRefundOrder(id, body.reason)
  if (!result.ok) {
    badRequest(result.error === 'not_found' ? 'Mission introuvable.' : result.error === 'reason_required' ? 'Motif requis.' : 'Statut incompatible avec l’annulation.')
  }
  await recordAuditLog({ actor: admin, action: 'mission.cancel', targetType: 'mission', targetId: id, metadata: { reason: body.reason } })
  return { ok: true }
})
