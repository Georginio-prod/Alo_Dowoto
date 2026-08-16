import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Export de la liste des comptes (toutes les lignes correspondant aux filtres,
 * sans pagination) pour la génération d'un CSV côté dashboard. Réservé aux
 * admins possédant `users.view`. Mêmes filtres que /api/admin/users
 * (?role=…&subscriber=yes|no&search=…). Borné à 50 000 lignes par sécurité.
 * Le `passwordHash` n'est jamais exposé.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'users.view')

  const query = getQuery(event)
  const search = String(query.search ?? '').trim()
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
  if (search) {
    where.OR = [
      { username: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { contact: { contains: search } },
      { location: { contains: search } },
    ]
  }

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
      contact: true,
      role: true,
      username: true,
      firstName: true,
      lastName: true,
      location: true,
      createdAt: true,
      providerProfile: { select: { verified: true } },
      subscriptions: { where: { status: 'actif' }, select: { id: true }, take: 1 },
      _count: { select: { payments: true, subscriptions: true } },
    },
  })

  const items = rows.map((r) => ({
    firstName: r.firstName,
    lastName: r.lastName,
    username: r.username,
    contact: r.contact,
    role: r.role,
    location: r.location,
    isProvider: !!r.providerProfile,
    verifiedProvider: r.providerProfile?.verified ?? false,
    isSubscriber: r.subscriptions.length > 0,
    paymentCount: r._count.payments,
    subscriptionCount: r._count.subscriptions,
    createdAt: r.createdAt.getTime(),
  }))

  return { items, total: items.length }
})
