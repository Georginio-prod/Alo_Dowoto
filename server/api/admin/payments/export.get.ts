import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { exportMovementsCsv, type AdminMovementFilters, type AdminMovementKind } from '~~/server/utils/adminPaymentStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Exporte la période filtrée en CSV (#dashboard-admin, module 5). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const query = getQuery(event)

  const filters: AdminMovementFilters = {
    kind: typeof query.kind === 'string' && query.kind ? (query.kind as AdminMovementKind) : undefined,
    status: typeof query.status === 'string' && query.status ? query.status : undefined,
    method: typeof query.method === 'string' && query.method ? query.method : undefined,
    from: typeof query.from === 'string' && query.from ? Number(query.from) : undefined,
    to: typeof query.to === 'string' && query.to ? Number(query.to) : undefined,
  }

  const csv = await exportMovementsCsv(filters)
  await recordAuditLog({ actor: admin, action: 'payments.export', targetType: 'payments', metadata: { ...filters } })

  setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'attachment; filename="paiements.csv"')
  return csv
})
