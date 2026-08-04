import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { promoteToAdmin } from '~~/server/utils/userStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({ userId: requiredTrimmed("L'identifiant du compte est requis."), level: z.enum(['admin', 'moderateur', 'support']) })

/** Promeut un compte existant au rôle admin (#dashboard-admin, module 12) — action sensible, tracée. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, schema)

  const user = await promoteToAdmin(body.userId, body.level)
  await recordAuditLog({ actor: admin, action: 'team.promote', targetType: 'user', targetId: body.userId, metadata: { level: body.level } })
  return { user }
})
