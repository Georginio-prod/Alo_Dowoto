import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { getConversionFunnel, getMissionsLast30Days, getOverviewKpis, getRecentActivity, getRevenueBySector } from '~~/server/utils/adminOverview'

/** Vue d'ensemble du dashboard admin (#dashboard-admin, module 1). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const [kpis, missions30d, revenueBySector, funnel, recentActivity] = await Promise.all([
    getOverviewKpis(),
    getMissionsLast30Days(),
    getRevenueBySector(),
    getConversionFunnel(),
    getRecentActivity(10),
  ])

  return { kpis, missions30d, revenueBySector, funnel, recentActivity }
})
