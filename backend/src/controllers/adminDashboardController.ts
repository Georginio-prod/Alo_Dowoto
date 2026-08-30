import type { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { readAdminQueryString } from '../utils/adminList'
import { SECTORS } from '../data/sectors'
import { countBySector } from '../services/providerDirectoryService'
import { TACIT_VALIDATION_DELAY_MS } from '../services/escrowOrderService'
import { kycDecisionService } from '../services/kycDecisionService'
import {
  getConversionFunnel,
  getMissionsLast30Days,
  getOverviewKpis,
  getRecentActivity,
  getRevenueBySector,
} from '../services/adminOverviewService'

/**
 * Dashboard admin desktop (#admin) — sous-lot 2 : vues d'agrégats en LECTURE
 * SEULE (vue d'ensemble, compteurs, catalogue, recherche). Portées iso depuis
 * `server/api/admin/{overview,badges,catalog,search}.get.ts` (ADR-0017). Le
 * middleware a déjà authentifié et contrôlé la permission (voir `admin.routes.ts`).
 * Les listes paginées sont dans `adminListController.ts`.
 */

/** GET /api/admin/overview — superset des agrégats desktop + KPIs/entonnoir/activité web (dashboard.view). */
export async function adminOverview(_req: Request, res: Response): Promise<void> {
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

  res.json({
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
    kpis,
    missions30d,
    revenueBySector,
    funnel,
    recentActivity,
  })
}

/** GET /api/admin/badges — compteurs « à traiter » de la barre latérale (requireAdminRole). */
export async function adminBadges(_req: Request, res: Response): Promise<void> {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [unverified, disputed, complaints, pendingSubs] = await Promise.all([
    prisma.providerProfile.count({ where: { verified: false } }),
    prisma.escrowOrder.count({ where: { status: 'disputed' } }),
    prisma.complaint.count({ where: { createdAt: { gte: since7d } } }),
    prisma.subscription.count({ where: { status: 'en_attente' } }),
  ])

  res.json({ unverified, disputed, complaints, pendingSubs })
}

/** GET /api/admin/alerts — compteurs de la cloche de l'en-tête (requireAdminRole). */
export async function adminAlerts(_req: Request, res: Response): Promise<void> {
  const [disputesOpen, kycQueue, blockedThreshold] = await Promise.all([
    prisma.escrowOrder.count({ where: { status: 'disputed' } }),
    kycDecisionService.listKycQueue(),
    Promise.resolve(Date.now() - TACIT_VALIDATION_DELAY_MS * 2),
  ])

  const kycPending = kycQueue.filter((entry) => entry.latestDecision === null).length

  const paymentsBlocked = await prisma.escrowOrder.count({
    where: {
      status: { in: ['in_escrow', 'delivered'] },
      createdAt: { lt: new Date(blockedThreshold) },
    },
  })

  res.json({
    disputesOpen,
    kycPending,
    paymentsBlocked,
    total: disputesOpen + kycPending + paymentsBlocked,
  })
}

/** GET /api/admin/catalog — catalogue des secteurs (lecture seule, catalog.view). */
export async function adminCatalog(_req: Request, res: Response): Promise<void> {
  const sectors = await Promise.all(
    SECTORS.map(async (s) => ({
      slug: s.slug,
      name: s.name,
      emoji: s.emoji,
      icon: s.icon,
      color: s.color,
      ink: s.ink,
      subSectors: s.subSectors.map((ss) => ss.name),
      providerCount: await countBySector(s.slug),
    })),
  )

  res.json({
    editable: false,
    sectors,
    totals: {
      sectors: sectors.length,
      subSectors: sectors.reduce((n, s) => n + s.subSectors.length, 0),
      providers: sectors.reduce((n, s) => n + s.providerCount, 0),
    },
  })
}

/** GET /api/admin/search — recherche globale de l'en-tête (requireAdminRole). */
export async function adminSearch(req: Request, res: Response): Promise<void> {
  const q = readAdminQueryString(req, 'q')
  if (q.length < 2) {
    res.json({ results: [] })
    return
  }

  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { contact: { contains: q } },
      ],
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    results: rows.map((row) => ({
      id: row.id,
      label: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.username || row.contact,
      contact: row.contact,
      role: row.role,
    })),
  })
}
