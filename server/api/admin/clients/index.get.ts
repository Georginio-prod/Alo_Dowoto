import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { parseAdminPagination } from '~~/server/utils/adminPagination'
import { listAdminClients, type AdminClientFilters } from '~~/server/utils/adminClientStore'

/** Liste paginée et filtrable des chercheurs (#dashboard-admin, module 3). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const { page, pageSize } = parseAdminPagination(query)

  const filters: AdminClientFilters = {
    status: query.status === 'active' || query.status === 'suspended' ? query.status : undefined,
    riskFlag: query.risk === '1' ? true : undefined,
    query: typeof query.q === 'string' && query.q ? query.q : undefined,
  }

  const result = await listAdminClients(filters, page, pageSize)
  return { ...result, page, pageSize }
})
