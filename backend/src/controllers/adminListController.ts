import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { paginated, readAdminListParams, readAdminQueryString } from '../utils/adminList'
import { userRepository } from '../repositories/userRepository'
import { resolveProviderIdentity } from '../services/adminProviderResolveService'

/**
 * Dashboard admin desktop (#admin) — sous-lot 2 : listes paginées « annuaire »
 * en LECTURE SEULE (comptes, prestataires, témoignages, réclamations). Portées
 * iso depuis `server/api/admin/{users,providers,testimonials,complaints}.get.ts`
 * (ADR-0017). Le middleware a déjà authentifié et contrôlé la permission (voir
 * `admin.routes.ts`). Les listes financières sont dans `adminFinanceController.ts`.
 */

/** GET /api/admin/users — liste paginée des comptes (users.view). */
export async function adminUsers(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const roleFilter = readAdminQueryString(req, 'role')
  const subscriberFilter = readAdminQueryString(req, 'subscriber')

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

  res.json(paginated(items, total, params))
}

/** GET /api/admin/providers — liste paginée des profils prestataires (providers.view). */
export async function adminProviders(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const verified = readAdminQueryString(req, 'verified')

  const where: Prisma.ProviderProfileWhereInput = {}
  if (verified === 'true') where.verified = true
  if (verified === 'false') where.verified = false
  if (params.search) {
    where.OR = [
      { displayName: { contains: params.search } },
      { city: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        displayName: true,
        city: true,
        verified: true,
        ratingAverage: true,
        reviewCount: true,
        rateFrom: true,
        updatedAt: true,
        sector: { select: { name: true, emoji: true } },
        user: { select: { contact: true, firstName: true, lastName: true } },
      },
    }),
    prisma.providerProfile.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    city: r.city,
    verified: r.verified,
    ratingAverage: r.ratingAverage,
    reviewCount: r.reviewCount,
    rateFrom: r.rateFrom,
    updatedAt: r.updatedAt.getTime(),
    sector: r.sector ? `${r.sector.emoji} ${r.sector.name}` : null,
    contact: r.user?.contact ?? null,
    fullName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
  }))

  res.json(paginated(items, total, params))
}

/** GET /api/admin/testimonials — liste paginée des témoignages réels (testimonials.moderate). */
export async function adminTestimonials(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const hiddenFilter = readAdminQueryString(req, 'hidden')

  const where: Prisma.TestimonialWhereInput = {}
  if (hiddenFilter === 'yes') where.hidden = true
  else if (hiddenFilter === 'no') where.hidden = false
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { message: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: { id: true, name: true, role: true, message: true, rating: true, hidden: true, createdAt: true },
    }),
    prisma.testimonial.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    message: r.message,
    rating: r.rating,
    hidden: r.hidden,
    createdAt: r.createdAt.getTime(),
  }))

  res.json(paginated(items, total, params))
}

/** GET /api/admin/conversations — liste paginée des mises en relation (conversations.view). */
export async function adminConversations(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)

  const where: Prisma.ConversationWhereInput = {}
  if (params.search) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: params.search } },
          { lastName: { contains: params.search } },
          { contact: { contains: params.search } },
          { location: { contains: params.search } },
        ],
      },
      select: { id: true },
    })
    where.clientId = { in: users.map((u) => u.id) }
  }

  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        clientId: true,
        providerId: true,
        firstContactDone: true,
        createdAt: true,
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ])

  const items = await Promise.all(
    rows.map(async (r) => {
      const client = await userRepository.findById(r.clientId)
      const provider = await resolveProviderIdentity(r.providerId)
      return {
        id: r.id,
        firstContactDone: r.firstContactDone,
        createdAt: r.createdAt.getTime(),
        messageCount: r._count.messages,
        lastMessageAt: r.messages[0]?.createdAt.getTime() ?? null,
        client: client
          ? {
              id: client.id,
              name: `${client.firstName} ${client.lastName}`.trim() || client.username || client.contact,
              contact: client.contact,
              city: client.location,
            }
          : { id: r.clientId, name: 'Compte supprimé', contact: null, city: null, missing: true },
        provider: {
          id: provider.id,
          name: provider.name,
          sector: provider.sector,
          city: provider.city,
          photoUrl: provider.photoUrl,
          isRealAccount: provider.isRealAccount,
          missing: provider.missing ?? false,
        },
      }
    }),
  )

  res.json(paginated(items, total, params))
}

/** GET /api/admin/complaints — liste paginée des réclamations (complaints.view). */
export async function adminComplaints(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const category = readAdminQueryString(req, 'category')
  const status = readAdminQueryString(req, 'status')

  const where: Prisma.ComplaintWhereInput = {}
  if (category) where.category = category
  if (status === 'nouveau' || status === 'en_cours' || status === 'resolu') where.status = status
  if (params.search) {
    where.OR = [
      { subject: { contains: params.search } },
      { message: { contains: params.search } },
      { contactEmail: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        category: true,
        subject: true,
        message: true,
        contactEmail: true,
        userId: true,
        createdAt: true,
        status: true,
        adminNote: true,
        handledAt: true,
      },
    }),
    prisma.complaint.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    subject: r.subject,
    message: r.message,
    contactEmail: r.contactEmail,
    userId: r.userId,
    createdAt: r.createdAt.getTime(),
    status: r.status,
    adminNote: r.adminNote,
    handledAt: r.handledAt?.getTime() ?? null,
  }))

  res.json(paginated(items, total, params))
}
