import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { createPlanConfig } from '~~/server/utils/adminPlanStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const planSchema = z.object({
  slug: requiredTrimmed('Le slug est requis.'),
  name: requiredTrimmed('Le nom est requis.'),
  priceAmount: z.number().int().positive(),
  durationDays: z.number().int().positive(),
  commissionRate: z.number().min(0).max(1),
  features: z.string().trim(),
})

/** Crée une formule d'abonnement (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, planSchema)

  const plan = await createPlanConfig({ ...body, active: true })
  await recordAuditLog({ actor: admin, action: 'plan.create', targetType: 'plan', targetId: plan.id, metadata: { slug: body.slug } })
  return { plan }
})
