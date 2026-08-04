import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { setPlanConfigActive } from '~~/server/utils/adminPlanStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const toggleSchema = z.object({ active: z.boolean() })

/** Active/désactive une formule (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, toggleSchema)

  const plan = await setPlanConfigActive(id, body.active)
  await recordAuditLog({ actor: admin, action: body.active ? 'plan.enable' : 'plan.disable', targetType: 'plan', targetId: id })
  return { plan }
})
