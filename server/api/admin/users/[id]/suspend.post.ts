import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { reasonBodySchema } from '~~/server/utils/apiValidationAdmin'
import { suspendUser } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Suspend un compte (prestataire ou chercheur) — invalide ses sessions actives (#dashboard-admin, modules 2/3). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, reasonBodySchema)

  const user = await suspendUser(id, body.reason)
  await recordAuditLog({ actor: admin, action: 'user.suspend', targetType: 'user', targetId: id, metadata: { reason: body.reason } })
  return { user }
})
