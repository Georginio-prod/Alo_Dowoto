import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Export (toutes lignes filtrées) des abonnements prestataires pour le CSV du
 * dashboard. Mêmes filtres que /api/admin/subscriptions
 * (?status=en_attente|actif|expire&search=…). Réservé à `subscriptions.view`.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'subscriptions.view')

  const q = getQuery(event)
  const search = String(q.search ?? '').trim()
  const status = String(q.status ?? '').trim()

  const where: Prisma.SubscriptionWhereInput = {}
  if (status === 'en_attente' || status === 'actif' || status === 'expire') {
    where.status = status
  }
  if (search) {
    where.plan = { contains: search, mode: 'insensitive' }
  }

  const rows = await prisma.subscription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
      plan: true,
      status: true,
      isTrial: true,
      dateDebut: true,
      dateFin: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, contact: true } },
    },
  })

  const items = rows.map((r) => ({
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
    plan: r.plan,
    status: r.status,
    isTrial: r.isTrial,
    dateDebut: r.dateDebut?.getTime() ?? null,
    dateFin: r.dateFin?.getTime() ?? null,
    createdAt: r.createdAt.getTime(),
  }))

  return { items, total: items.length }
})
