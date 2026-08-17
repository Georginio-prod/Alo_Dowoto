import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listCoupons } from '~~/server/utils/adminPlanStore'

/** Codes promo (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { coupons: await listCoupons() }
})
