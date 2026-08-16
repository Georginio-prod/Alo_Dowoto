import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Export (toutes lignes filtrées, sans pagination) des paiements Mobile Money
 * pour le CSV du dashboard. Mêmes filtres que /api/admin/payments
 * (?status=pending|confirmed|failed&search=…). Réservé à `payments.view`.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'payments.view')

  const q = getQuery(event)
  const search = String(q.search ?? '').trim()
  const status = String(q.status ?? '').trim()

  const where: Prisma.PaymentWhereInput = {}
  if (status === 'pending' || status === 'confirmed' || status === 'failed') {
    where.status = status
  }
  if (search) {
    where.OR = [{ phone: { contains: search } }, { operatorRef: { contains: search } }]
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
