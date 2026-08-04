import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { reasonBodySchema } from '~~/server/utils/apiValidationAdmin'
import { rejectKyc } from '~~/server/utils/kycDecisionStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Refuse la vérification d'identité d'un prestataire, motif obligatoire — révoque le badge vérifié (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, reasonBodySchema)

  const decision = await rejectKyc(id, admin.id, body.reason)
  await recordAuditLog({ actor: admin, action: 'kyc.reject', targetType: 'user', targetId: id, metadata: { reason: body.reason } })
  return { decision }
})
