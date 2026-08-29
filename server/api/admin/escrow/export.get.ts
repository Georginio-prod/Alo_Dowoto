import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Export (toutes lignes filtrées) des commandes en séquestre pour le CSV du
 * dashboard. Mêmes filtres que /api/admin/escrow (?status=…&search=…).
 * Réservé à `escrow.view`.
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
  await requireAdminPermission(event, 'escrow.view')

  const q = getQuery(event)
  const search = String(q.search ?? '').trim()
  const status = String(q.status ?? '').trim()

  const where: Prisma.EscrowOrderWhereInput = {}
  if (VALID_STATUS.has(status)) {
    where.status = status as Prisma.EscrowOrderWhereInput['status']
  }
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { clientId: { contains: search, mode: 'insensitive' } },
      { providerId: { contains: search, mode: 'insensitive' } },
    ]
  }

  const rows = await prisma.escrowOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
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
  })

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

  return { items, total: items.length }
})
