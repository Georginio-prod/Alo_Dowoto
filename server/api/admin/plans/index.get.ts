import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listPlanConfigs } from '~~/server/utils/adminPlanStore'

/** Formules d'abonnement configurées (#dashboard-admin, module 7). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { plans: await listPlanConfigs() }
})
