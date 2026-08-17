import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des comptes pour le dashboard admin. Recherche plein-texte
 * simple sur nom d'utilisateur, prénom, nom, contact et ville ; filtres
 * optionnels par rôle (?role=client|prestataire|admin) et par abonnement
 * (?subscriber=yes|no — présence d'un abonnement actif). Le `passwordHash`
 * n'est jamais exposé (select explicite, réduit à un booléen).
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'users.view')

  const params = readAdminListParams(event)
  const query = getQuery(event)
  const roleFilter = String(query.role ?? '').trim()
  const subscriberFilter = String(query.subscriber ?? '').trim()

  const where: Prisma.UserWhereInput = {}
  if (roleFilter === 'client' || roleFilter === 'prestataire' || roleFilter === 'admin') {
    where.role = roleFilter
  }
  if (subscriberFilter === 'yes') {
    where.subscriptions = { some: { status: 'actif' } }
  } else if (subscriberFilter === 'no') {
    where.subscriptions = { none: { status: 'actif' } }
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
        suspendedAt: true,
        passwordHash: true,
        providerProfile: { select: { verified: true } },
        subscriptions: { where: { status: 'actif' }, select: { id: true }, take: 1 },
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
    suspended: !!r.suspendedAt,
    passwordSet: !!r.passwordHash,
    isProvider: !!r.providerProfile,
    verifiedProvider: r.providerProfile?.verified ?? false,
    isSubscriber: r.subscriptions.length > 0,
    paymentCount: r._count.payments,
    subscriptionCount: r._count.subscriptions,
  }))

  return paginated(items, total, params)
})
