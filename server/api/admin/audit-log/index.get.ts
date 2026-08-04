import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { parseAdminPagination } from '~~/server/utils/adminPagination'
import { listAuditLog } from '~~/server/utils/auditLog'

/** Journal d'audit horodaté de toutes les actions sensibles (#dashboard-admin, module 12). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const { page, pageSize } = parseAdminPagination(query)

  const result = await listAuditLog(
    { targetType: typeof query.targetType === 'string' && query.targetType ? query.targetType : undefined, query: typeof query.q === 'string' && query.q ? query.q : undefined },
    page,
    pageSize,
  )
  return { ...result, page, pageSize }
})
