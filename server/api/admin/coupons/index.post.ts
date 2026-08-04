import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { createCoupon } from '~~/server/utils/adminPlanStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const couponSchema = z.object({
  code: requiredTrimmed('Le code est requis.'),
  discountType: z.enum(['percent', 'amount']),
  discountValue: z.number().int().positive(),
  expiresAt: z.number().optional(),
  usageLimit: z.number().int().positive().optional(),
})

/** Crée un code promo (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, couponSchema)

  const coupon = await createCoupon(body)
  await recordAuditLog({ actor: admin, action: 'coupon.create', targetType: 'coupon', targetId: coupon.id, metadata: { code: body.code } })
  return { coupon }
})
