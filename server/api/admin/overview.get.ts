import { prisma } from '~~/server/utils/prisma'
import {
  getConversionFunnel,
  getMissionsLast30Days,
  getOverviewKpis,
  getRecentActivity,
  getRevenueBySector,
} from '~~/server/utils/adminOverview'

/**
 * Vue d'ensemble du dashboard admin — SUPERSET réconciliant les deux dashboards :
 * les compteurs/agrégats du desktop (#admin, champs `users`/`providers`/`payments`…)
 * ET les KPIs/entonnoir/activité du web (#dashboard-admin, champs
 * `kpis`/`missions30d`/`funnel`…). Chaque frontend lit ses propres champs.
 * Lecture seule.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'dashboard.view')

  const now = Date.now()
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const [
    usersTotal,
    usersByRole,
    users7d,
    providersTotal,
    providersVerified,
    paymentsByStatus,
    confirmedAgg,
    subsByStatus,
    escrowByStatus,
    complaintsTotal,
    complaints7d,
    testimonialsTotal,
    recentUsers,
    recentComplaints,
    signupsRaw,
    // --- Bloc web (#dashboard-admin) ---
    kpis,
    missions30d,
    revenueBySector,
    funnel,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: since7d } } }),
    prisma.providerProfile.count(),
    prisma.providerProfile.count({ where: { verified: true } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.escrowOrder.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    prisma.complaint.count(),
    prisma.complaint.count({ where: { createdAt: { gte: since7d } } }),
    prisma.testimonial.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, username: true, firstName: true, lastName: true, role: true, location: true, createdAt: true },
    }),
    prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, category: true, subject: true, contactEmail: true, createdAt: true },
    }),
    prisma.user.findMany({ where: { createdAt: { gte: since30d } }, select: { createdAt: true } }),
    getOverviewKpis(),
    getMissionsLast30Days(),
    getRevenueBySector(),
    getConversionFunnel(),
    getRecentActivity(10),
  ])

  const roleCount = (role: string) => usersByRole.find((r) => r.role === role)?._count._all ?? 0

  const days: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000)
    days.push({ date: d.toISOString().slice(0, 10), count: 0 })
  }
  const dayIndex = new Map(days.map((d, i) => [d.date, i]))
  for (const u of signupsRaw) {
    const idx = dayIndex.get(u.createdAt.toISOString().slice(0, 10))
    const bucket = idx !== undefined ? days[idx] : undefined
    if (bucket) bucket.count++
  }

  return {
    generatedAt: now,
    users: {
      total: usersTotal,
      clients: roleCount('client'),
      prestataires: roleCount('prestataire'),
      admins: roleCount('admin'),
      new7d: users7d,
    },
    providers: { total: providersTotal, verified: providersVerified },
    payments: {
      byStatus: paymentsByStatus.map((p) => ({ status: p.status, count: p._count._all, amount: p._sum.amount ?? 0 })),
      confirmedCount: confirmedAgg._count._all,
      confirmedAmount: confirmedAgg._sum.amount ?? 0,
    },
    subscriptions: { byStatus: subsByStatus.map((s) => ({ status: s.status, count: s._count._all })) },
    escrow: {
      byStatus: escrowByStatus.map((e) => ({ status: e.status, count: e._count._all, amount: e._sum.amount ?? 0 })),
    },
    complaints: { total: complaintsTotal, new7d: complaints7d },
    testimonials: { total: testimonialsTotal },
    signups14d: days,
    recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.getTime() })),
    recentComplaints: recentComplaints.map((c) => ({ ...c, createdAt: c.createdAt.getTime() })),
    // --- Superset web (#dashboard-admin) ---
    kpis,
    missions30d,
    revenueBySector,
    funnel,
    recentActivity,
  }
})
