import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { setCouponActive } from '~~/server/utils/adminPlanStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const toggleSchema = z.object({ active: z.boolean() })

/** Active/désactive un code promo (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, toggleSchema)

  const coupon = await setCouponActive(id, body.active)
  await recordAuditLog({ actor: admin, action: body.active ? 'coupon.enable' : 'coupon.disable', targetType: 'coupon', targetId: id })
  return { coupon }
})
