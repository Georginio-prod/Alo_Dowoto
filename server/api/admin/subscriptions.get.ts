import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des abonnements prestataires pour le dashboard admin. Filtre
 * optionnel ?status=en_attente|actif|expire.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'subscriptions.view')

  const params = readAdminListParams(event)
  const status = String(getQuery(event).status ?? '').trim()

  const where: Prisma.SubscriptionWhereInput = {}
  if (status === 'en_attente' || status === 'actif' || status === 'expire') {
    where.status = status
  }
  if (params.search) {
    where.plan = { contains: params.search }
  }

  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        plan: true,
        status: true,
        isTrial: true,
        dateDebut: true,
        dateFin: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, contact: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    plan: r.plan,
    status: r.status,
    isTrial: r.isTrial,
    dateDebut: r.dateDebut?.getTime() ?? null,
    dateFin: r.dateFin?.getTime() ?? null,
    createdAt: r.createdAt.getTime(),
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
  }))

  return paginated(items, total, params)
})
