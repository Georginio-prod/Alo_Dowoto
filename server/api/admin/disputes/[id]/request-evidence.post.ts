import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { requestAdditionalEvidence } from '~~/server/utils/adminDisputeStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Demande une preuve complémentaire aux deux parties (#dashboard-admin, module 6). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const result = await requestAdditionalEvidence(id)
  if (!result.ok) notFound('Litige introuvable.')
  await recordAuditLog({ actor: admin, action: 'dispute.request_evidence', targetType: 'escrow_order', targetId: id })
  return { ok: true }
})
