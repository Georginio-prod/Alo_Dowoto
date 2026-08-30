import type { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { badRequest, notFound } from '../utils/apiError'
import { userRepository } from '../repositories/userRepository'
import { resolveProviderIdentity } from '../services/adminProviderResolveService'

/**
 * Dashboard admin (#admin) — sous-lot 2 : fiches de DÉTAIL en LECTURE SEULE.
 * Portées iso depuis `server/api/admin/{users/[id],conversations/[id]}.get.ts`
 * (ADR-0017). Le middleware a déjà authentifié/autorisé. Le `passwordHash` n'est
 * jamais exposé (réduit à un booléen). Les fiches prestataire/chercheur/mission
 * du dashboard web s'appuient sur des stores non encore portés (sous-lot suivant).
 */

/** GET /api/admin/users/:id — fiche détaillée d'un compte (users.view). */
export async function adminUserDetail(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      contact: true,
      role: true,
      username: true,
      firstName: true,
      lastName: true,
      location: true,
      latitude: true,
      longitude: true,
      referralCode: true,
      createdAt: true,
      suspendedAt: true,
      passwordHash: true,
      googleId: true,
      providerProfile: {
        select: {
          id: true,
          displayName: true,
          city: true,
          description: true,
          rateFrom: true,
          verified: true,
          ratingAverage: true,
          reviewCount: true,
          sector: { select: { name: true } },
        },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, plan: true, status: true, isTrial: true, dateDebut: true, dateFin: true, createdAt: true },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, provider: true, amount: true, status: true, phone: true, createdAt: true },
      },
      _count: { select: { payments: true, subscriptions: true } },
    },
  })

  if (!u) notFound('Utilisateur introuvable.')

  // Le schéma backend référence l'auteur d'un avis par `authorId` (clé simple,
  // sans relation nommée), là où Nitro exposait `_count.reviewsWritten` :
  // on recompose le même compteur d'avis écrits par une requête dédiée.
  const [confirmedPaid, reviewsWritten] = await Promise.all([
    prisma.payment.aggregate({ where: { userId: id, status: 'confirmed' }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.review.count({ where: { authorId: id } }),
  ])

  const activeSub = u.subscriptions.find((s) => s.status === 'actif') ?? null

  res.json({
    id: u.id,
    contact: u.contact,
    role: u.role,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    location: u.location,
    latitude: u.latitude,
    longitude: u.longitude,
    referralCode: u.referralCode,
    createdAt: u.createdAt.getTime(),
    suspendedAt: u.suspendedAt?.getTime() ?? null,
    passwordSet: !!u.passwordHash,
    hasGoogle: !!u.googleId,
    isProvider: !!u.providerProfile,
    isSubscriber: !!activeSub,
    provider: u.providerProfile
      ? {
          id: u.providerProfile.id,
          displayName: u.providerProfile.displayName,
          sector: u.providerProfile.sector?.name ?? null,
          city: u.providerProfile.city,
          description: u.providerProfile.description,
          rateFrom: u.providerProfile.rateFrom,
          verified: u.providerProfile.verified,
          ratingAverage: u.providerProfile.ratingAverage,
          reviewCount: u.providerProfile.reviewCount,
        }
      : null,
    subscriptions: u.subscriptions.map((s) => ({
      id: s.id,
      plan: s.plan,
      status: s.status,
      isTrial: s.isTrial,
      dateDebut: s.dateDebut?.getTime() ?? null,
      dateFin: s.dateFin?.getTime() ?? null,
      createdAt: s.createdAt.getTime(),
    })),
    payments: u.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      amount: p.amount,
      status: p.status,
      phone: p.phone,
      createdAt: p.createdAt.getTime(),
    })),
    stats: {
      paymentCount: u._count.payments,
      subscriptionCount: u._count.subscriptions,
      reviewCount: reviewsWritten,
      totalPaid: confirmedPaid._sum.amount ?? 0,
      confirmedPayments: confirmedPaid._count._all,
    },
  })
}

/** GET /api/admin/conversations/:id — détail d'une mise en relation + fil de messages (conversations.view). */
export async function adminConversationDetail(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant de conversation manquant.')

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, clientId: true, providerId: true, firstContactDone: true, clientContact: true, createdAt: true },
  })
  if (!conv) notFound('Conversation introuvable.')

  const client = await userRepository.findById(conv.clientId)
  const provider = await resolveProviderIdentity(conv.providerId)

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: { id: true, senderRole: true, body: true, kind: true, locationLat: true, locationLng: true, createdAt: true },
  })

  res.json({
    id: conv.id,
    firstContactDone: conv.firstContactDone,
    clientContact: conv.clientContact,
    createdAt: conv.createdAt.getTime(),
    client: client
      ? {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`.trim() || client.username || client.contact,
          username: client.username,
          contact: client.contact,
          city: client.location,
          latitude: client.latitude ?? null,
          longitude: client.longitude ?? null,
          createdAt: client.createdAt.getTime(),
        }
      : { id: conv.clientId, name: 'Compte supprimé', missing: true },
    provider: {
      id: provider.id,
      name: provider.name,
      contact: provider.contact,
      sector: provider.sector,
      city: provider.city,
      photoUrl: provider.photoUrl,
      latitude: provider.latitude,
      longitude: provider.longitude,
      isRealAccount: provider.isRealAccount,
      missing: provider.missing ?? false,
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      body: m.body,
      kind: m.kind,
      locationLat: m.locationLat,
      locationLng: m.locationLng,
      createdAt: m.createdAt.getTime(),
    })),
  })
}
