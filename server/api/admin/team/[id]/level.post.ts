import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { setAdminLevel } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({ level: z.enum(['admin', 'moderateur', 'support'], { error: 'Niveau invalide.' }) })

/** Change le niveau d'accès d'un membre de l'équipe (#dashboard-admin, module 12). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, schema)

  const user = await setAdminLevel(id, body.level)
  await recordAuditLog({ actor: admin, action: 'team.level.update', targetType: 'user', targetId: id, metadata: { level: body.level } })
  return { user }
})
