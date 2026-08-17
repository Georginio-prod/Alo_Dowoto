import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { reactivateUser } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Réactive un compte suspendu (#dashboard-admin, modules 2/3). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const user = await reactivateUser(id)
  await recordAuditLog({ actor: admin, action: 'user.reactivate', targetType: 'user', targetId: id })
  return { user }
})
