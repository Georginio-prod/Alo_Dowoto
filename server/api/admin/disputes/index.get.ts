import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listAdminDisputes } from '~~/server/utils/adminDisputeStore'

/** File d'attente des litiges ouverts (#dashboard-admin, module 6). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const disputes = await listAdminDisputes()
  return { disputes }
})
