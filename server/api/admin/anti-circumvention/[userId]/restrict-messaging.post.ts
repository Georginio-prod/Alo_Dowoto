import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { setMessagingRestricted } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({ restricted: z.boolean() })

/** Restreint (ou lève la restriction de) la messagerie d'un compte (#dashboard-admin, module 9). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const userId = getRouterParam(event, 'userId')
  if (!userId) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, schema)

  const user = await setMessagingRestricted(userId, body.restricted)
  await recordAuditLog({ actor: admin, action: body.restricted ? 'anti_circumvention.restrict' : 'anti_circumvention.unrestrict', targetType: 'user', targetId: userId })
  return { user }
})
