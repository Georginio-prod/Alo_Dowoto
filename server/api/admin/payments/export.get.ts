import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { exportMovementsCsv, type AdminMovementFilters, type AdminMovementKind } from '~~/server/utils/adminPaymentStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/**
 * Export des paiements — DEUX formats sur la même route (réconciliation des
 * dashboards) :
 *  - `?format=csv` (ou en-tête `Accept: text/csv`) → CSV du dashboard web
 *    (#dashboard-admin, module 5, filtres de mouvements) + journal d'audit ;
 *  - sinon → JSON `{ items, total }` pour le dashboard desktop (#admin,
 *    permission `payments.view`), qui génère le CSV côté client.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const wantsCsv =
    String(q.format ?? '') === 'csv' || String(getHeader(event, 'accept') ?? '').includes('text/csv')

  // --- Format CSV (dashboard web #dashboard-admin) ---
  if (wantsCsv) {
    const admin = await requireAdminRole(event)
    const filters: AdminMovementFilters = {
      kind: typeof q.kind === 'string' && q.kind ? (q.kind as AdminMovementKind) : undefined,
      status: typeof q.status === 'string' && q.status ? q.status : undefined,
      method: typeof q.method === 'string' && q.method ? q.method : undefined,
      from: typeof q.from === 'string' && q.from ? Number(q.from) : undefined,
      to: typeof q.to === 'string' && q.to ? Number(q.to) : undefined,
    }
    const csv = await exportMovementsCsv(filters)
    await recordAuditLog({ actor: admin, action: 'payments.export', targetType: 'payments', metadata: { ...filters } })
    setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'content-disposition', 'attachment; filename="paiements.csv"')
    return csv
  }

  // --- Format JSON (dashboard desktop #admin) ---
  await requireAdminPermission(event, 'payments.view')

  const search = String(q.search ?? '').trim()
  const status = String(q.status ?? '').trim()

  const where: Prisma.PaymentWhereInput = {}
  if (status === 'pending' || status === 'confirmed' || status === 'failed') {
    where.status = status
  }
  if (search) {
    where.OR = [{ phone: { contains: search, mode: 'insensitive' } }, { operatorRef: { contains: search, mode: 'insensitive' } }]
  }

  const rows = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
      provider: true,
      phone: true,
      amount: true,
      status: true,
      operatorRef: true,
      createdAt: true,
      resolvedAt: true,
      user: { select: { firstName: true, lastName: true, contact: true } },
      subscription: { select: { plan: true } },
    },
  })

  const items = rows.map((r) => ({
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
    provider: r.provider,
    phone: r.phone,
    amount: r.amount,
    status: r.status,
    plan: r.subscription?.plan ?? null,
    operatorRef: r.operatorRef,
    createdAt: r.createdAt.getTime(),
    resolvedAt: r.resolvedAt?.getTime() ?? null,
  }))

  return { items, total: items.length }
})
