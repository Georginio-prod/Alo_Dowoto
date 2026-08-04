import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { parseAdminPagination } from '~~/server/utils/adminPagination'
import { listAdminMissions, type AdminMissionFilters } from '~~/server/utils/adminMissionStore'
import type { EscrowOrderStatus } from '~~/server/utils/escrowOrderStore'
import { listAllServiceRequests } from '~~/server/utils/requestStore'

/** Liste paginée des missions (commandes en séquestre) + fiches préalables en brouillon (#dashboard-admin, module 4). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const { page, pageSize } = parseAdminPagination(query)

  const filters: AdminMissionFilters = {
    status: typeof query.status === 'string' && query.status ? (query.status as EscrowOrderStatus) : undefined,
  }

  const [result, drafts] = await Promise.all([
    listAdminMissions(filters, page, pageSize),
    Promise.resolve(listAllServiceRequests().slice(0, 20)),
  ])

  return { ...result, page, pageSize, drafts: drafts.map((d) => ({ id: d.id, title: d.title, userId: d.userId, createdAt: d.createdAt })) }
})
