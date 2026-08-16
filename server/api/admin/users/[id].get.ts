import { prisma } from '~~/server/utils/prisma'

/**
 * Fiche détaillée d'un compte pour le panneau latéral du dashboard (profil
 * complet façon fiche contact). Réservé aux admins (`users.view`). Agrège le
 * profil prestataire éventuel, les abonnements, les paiements et un petit
 * résumé financier. Lecture seule. Le `passwordHash` n'est jamais exposé.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'users.view')

  const id = getRouterParam(event, 'id')
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
      _count: { select: { payments: true, subscriptions: true, reviewsWritten: true } },
    },
  })

  if (!u) notFound('Utilisateur introuvable.')

  const confirmedPaid = await prisma.payment.aggregate({
    where: { userId: id, status: 'confirmed' },
    _sum: { amount: true },
    _count: { _all: true },
  })

  const activeSub = u.subscriptions.find((s) => s.status === 'actif') ?? null

  return {
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
      reviewCount: u._count.reviewsWritten,
      totalPaid: confirmedPaid._sum.amount ?? 0,
      confirmedPayments: confirmedPaid._count._all,
    },
  }
})
