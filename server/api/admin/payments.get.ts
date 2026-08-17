import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des paiements Mobile Money (abonnements) pour le dashboard
 * admin. Filtre optionnel ?status=pending|confirmed|failed. Montants en FCFA.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'payments.view')

  const params = readAdminListParams(event)
  const status = String(getQuery(event).status ?? '').trim()

  const where: Prisma.PaymentWhereInput = {}
  if (status === 'pending' || status === 'confirmed' || status === 'failed') {
    where.status = status
  }
  if (params.search) {
    where.OR = [
      { phone: { contains: params.search } },
      { operatorRef: { contains: params.search } },
    ]
  }

  const [rows, total, sumAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
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
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    phone: r.phone,
    amount: r.amount,
    status: r.status,
    operatorRef: r.operatorRef,
    createdAt: r.createdAt.getTime(),
    resolvedAt: r.resolvedAt?.getTime() ?? null,
    plan: r.subscription?.plan ?? null,
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
  }))

  return { ...paginated(items, total, params), sumAmount: sumAgg._sum.amount ?? 0 }
})
