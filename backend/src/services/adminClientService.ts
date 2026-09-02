import { prisma } from '../config/prisma'
import { toUser, type AdminUserView } from './userService'
import { listRequestsByUser } from './requestService'
import { reviewService } from './reviewService'

/**
 * Vue admin des comptes chercheur (#dashboard-admin, module 3), portée iso depuis
 * `server/utils/adminClientStore.ts` (ADR-0017) : compte réel (Prisma User)
 * enrichi des demandes/fiches préalables (`requestService`, réel mais volatile)
 * et des missions payées, litiges et remboursements réels (Prisma
 * EscrowOrder/WalletMovement).
 */

export interface AdminClientSummary {
  id: string
  name: string
  contact: string
  createdAt: number
  status: string
  riskFlag: boolean
  location: string
  requestsCount: number
  paidMissionsCount: number
  openDisputesCount: number
}

async function toSummary(user: AdminUserView): Promise<AdminClientSummary> {
  const [paidMissionsCount, openDisputesCount] = await Promise.all([
    prisma.escrowOrder.count({ where: { clientId: user.id, status: { not: 'awaiting_payment' } } }),
    prisma.escrowOrder.count({ where: { clientId: user.id, status: 'disputed' } }),
  ])
  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username,
    contact: user.contact,
    createdAt: user.createdAt,
    status: user.status,
    riskFlag: user.riskFlag,
    location: user.location,
    requestsCount: listRequestsByUser(user.id).length,
    paidMissionsCount,
    openDisputesCount,
  }
}

export interface AdminClientFilters {
  status?: 'active' | 'suspended'
  riskFlag?: boolean
  query?: string
}

export interface AdminClientListResult {
  clients: AdminClientSummary[]
  total: number
}

export async function listAdminClients(filters: AdminClientFilters, page: number, pageSize: number): Promise<AdminClientListResult> {
  const rows = await prisma.user.findMany({
    where: {
      role: 'client',
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.riskFlag !== undefined ? { riskFlag: filters.riskFlag } : {}),
      ...(filters.query
        ? {
            OR: [
              { username: { contains: filters.query } },
              { firstName: { contains: filters.query } },
              { lastName: { contains: filters.query } },
              { contact: { contains: filters.query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  const summaries = await Promise.all(rows.map((row) => toSummary(toUser(row))))
  const total = summaries.length
  const start = (page - 1) * pageSize
  return { clients: summaries.slice(start, start + pageSize), total }
}

export interface AdminClientDetail {
  user: AdminUserView
  requests: { id: string; title: string; createdAt: number }[]
  missions: { id: string; status: string; amount: number; createdAt: number; providerId: string }[]
  disputes: { id: string; disputeReason: string | null; disputedAt: number | null }[]
  refunds: { id: string; amount: number; createdAt: number }[]
  reviewsLeft: { id: string; rating: number; comment: string | null; createdAt: number; targetId: string }[]
}

export async function getAdminClientDetail(userId: string): Promise<AdminClientDetail | null> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  if (!row || row.role !== 'client') return null
  const user = toUser(row)

  const [missions, refunds, reviewsLeft] = await Promise.all([
    prisma.escrowOrder.findMany({ where: { clientId: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.walletMovement.findMany({ where: { walletUserId: userId, type: 'escrow_refund' }, orderBy: { createdAt: 'desc' } }),
    reviewService.listReviewsByAuthor(userId),
  ])

  return {
    user,
    requests: listRequestsByUser(userId).map((r) => ({ id: r.id, title: r.title, createdAt: r.createdAt })),
    missions: missions.map((m) => ({ id: m.id, status: m.status, amount: m.amount, createdAt: m.createdAt.getTime(), providerId: m.providerId })),
    disputes: missions.filter((m) => m.disputedAt !== null).map((m) => ({ id: m.id, disputeReason: m.disputeReason, disputedAt: m.disputedAt?.getTime() ?? null })),
    refunds: refunds.map((r) => ({ id: r.id, amount: r.amount, createdAt: r.createdAt.getTime() })),
    reviewsLeft: reviewsLeft.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, targetId: r.targetId })),
  }
}
