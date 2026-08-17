import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { markFalsePositive } from '~~/server/utils/adminAntiCircumventionStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({ note: z.string().trim().optional() })

/** Marque un signal comme faux positif — exclu du score de risque (#dashboard-admin, module 9). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const userId = getRouterParam(event, 'userId')
  if (!userId) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, schema)

  await markFalsePositive(userId, admin.id, body.note)
  await recordAuditLog({ actor: admin, action: 'anti_circumvention.false_positive', targetType: 'user', targetId: userId })
  return { ok: true }
})
