import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { parseAdminPagination } from '~~/server/utils/adminPagination'
import { listAdminProviders, type AdminProviderFilters, type KycStatus } from '~~/server/utils/adminProviderStore'

/** Liste paginée et filtrable des prestataires (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const { page, pageSize } = parseAdminPagination(query)

  const filters: AdminProviderFilters = {
    status: query.status === 'active' || query.status === 'suspended' ? query.status : undefined,
    sector: typeof query.sector === 'string' && query.sector ? query.sector : undefined,
    city: typeof query.city === 'string' && query.city ? query.city : undefined,
    subscriptionStatus: typeof query.subscriptionStatus === 'string' && query.subscriptionStatus ? query.subscriptionStatus : undefined,
    kycStatus: typeof query.kycStatus === 'string' && query.kycStatus ? (query.kycStatus as KycStatus) : undefined,
    query: typeof query.q === 'string' && query.q ? query.q : undefined,
  }

  const result = await listAdminProviders(filters, page, pageSize)
  return { ...result, page, pageSize }
})
