import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { riskFlagSchema } from '~~/server/utils/apiValidationAdmin'
import { setUserRiskFlag } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Marque (ou retire) un compte comme « à risque » (#dashboard-admin, modules 2/3/9). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, riskFlagSchema)

  const user = await setUserRiskFlag(id, body.riskFlag, body.note)
  await recordAuditLog({ actor: admin, action: body.riskFlag ? 'user.risk_flag.set' : 'user.risk_flag.clear', targetType: 'user', targetId: id, metadata: { note: body.note } })
  return { user }
})
