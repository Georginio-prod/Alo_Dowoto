import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { updatePlanConfig } from '~~/server/utils/adminPlanStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const patchSchema = z.object({
  name: z.string().trim().optional(),
  priceAmount: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  features: z.string().trim().optional(),
})

/** Modifie une formule d'abonnement (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, patchSchema)

  const plan = await updatePlanConfig(id, body)
  await recordAuditLog({ actor: admin, action: 'plan.update', targetType: 'plan', targetId: id, metadata: body })
  return { plan }
})
