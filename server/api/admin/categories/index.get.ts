import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listSectors } from '~~/server/utils/adminCategoryStore'

/** Catégories de service (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { sectors: await listSectors() }
})
