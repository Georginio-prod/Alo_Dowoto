import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des comptes pour le dashboard admin. Recherche plein-texte
 * simple sur nom d'utilisateur, prénom, nom et contact ; filtre optionnel par
 * rôle (?role=client|prestataire|admin). Le `passwordHash` n'est jamais
 * exposé (select explicite).
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const params = readAdminListParams(event)
  const roleFilter = String(getQuery(event).role ?? '').trim()

  const where: Prisma.UserWhereInput = {}
  if (roleFilter === 'client' || roleFilter === 'prestataire' || roleFilter === 'admin') {
    where.role = roleFilter
  }
  if (params.search) {
    where.OR = [
      { username: { contains: params.search } },
      { firstName: { contains: params.search } },
      { lastName: { contains: params.search } },
      { contact: { contains: params.search } },
      { location: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        contact: true,
        role: true,
        username: true,
        firstName: true,
        lastName: true,
        location: true,
        createdAt: true,
        passwordHash: true,
        _count: { select: { payments: true, subscriptions: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    contact: r.contact,
    role: r.role,
    username: r.username,
    firstName: r.firstName,
    lastName: r.lastName,
    location: r.location,
    createdAt: r.createdAt.getTime(),
    passwordSet: !!r.passwordHash,
    paymentCount: r._count.payments,
    subscriptionCount: r._count.subscriptions,
  }))

  return paginated(items, total, params)
})
