import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { parseAdminPagination } from '~~/server/utils/adminPagination'
import { listAdminMovements, listBlockedPayments, type AdminMovementFilters, type AdminMovementKind } from '~~/server/utils/adminPaymentStore'

/** Liste unifiée des mouvements financiers (#dashboard-admin, module 5) + alerte paiements bloqués. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const { page, pageSize } = parseAdminPagination(query)

  const filters: AdminMovementFilters = {
    kind: typeof query.kind === 'string' && query.kind ? (query.kind as AdminMovementKind) : undefined,
    status: typeof query.status === 'string' && query.status ? query.status : undefined,
    method: typeof query.method === 'string' && query.method ? query.method : undefined,
    from: typeof query.from === 'string' && query.from ? Number(query.from) : undefined,
    to: typeof query.to === 'string' && query.to ? Number(query.to) : undefined,
  }

  const [result, blocked] = await Promise.all([listAdminMovements(filters, page, pageSize), listBlockedPayments()])
  return { ...result, page, pageSize, blocked }
})
