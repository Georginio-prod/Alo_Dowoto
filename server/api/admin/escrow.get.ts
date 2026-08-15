import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des commandes en séquestre (escrow) pour le dashboard admin.
 * Filtre optionnel ?status=awaiting_payment|in_escrow|delivered|released|
 * refunded|disputed. Montants en FCFA. Surveiller particulièrement les
 * commandes `disputed` (litiges à arbitrer).
 */
const VALID_STATUS = new Set([
  'awaiting_payment',
  'in_escrow',
  'delivered',
  'released',
  'refunded',
  'disputed',
])

export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const params = readAdminListParams(event)
  const status = String(getQuery(event).status ?? '').trim()

  const where: Prisma.EscrowOrderWhereInput = {}
  if (VALID_STATUS.has(status)) {
    where.status = status as Prisma.EscrowOrderWhereInput['status']
  }
  if (params.search) {
    where.OR = [
      { id: { contains: params.search } },
      { clientId: { contains: params.search } },
      { providerId: { contains: params.search } },
    ]
  }

  const [rows, total, sumAgg] = await Promise.all([
    prisma.escrowOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        clientId: true,
        providerId: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        releasedAt: true,
        disputedAt: true,
        disputeReason: true,
        cancelReason: true,
      },
    }),
    prisma.escrowOrder.count({ where }),
    prisma.escrowOrder.aggregate({ where, _sum: { amount: true } }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    providerId: r.providerId,
    amount: r.amount,
    status: r.status,
    createdAt: r.createdAt.getTime(),
    paidAt: r.paidAt?.getTime() ?? null,
    releasedAt: r.releasedAt?.getTime() ?? null,
    disputedAt: r.disputedAt?.getTime() ?? null,
    disputeReason: r.disputeReason,
    cancelReason: r.cancelReason,
  }))

  return { ...paginated(items, total, params), sumAmount: sumAgg._sum.amount ?? 0 }
})
