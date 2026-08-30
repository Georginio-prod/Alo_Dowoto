import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { paginated, readAdminListParams, readAdminQueryString } from '../utils/adminList'

/**
 * Dashboard admin desktop (#admin) — sous-lot 2 : listes financières paginées
 * en LECTURE SEULE (paiements Mobile Money, séquestre, abonnements). Portées iso
 * depuis `server/api/admin/{payments,escrow,subscriptions}.get.ts` (ADR-0017).
 * Le middleware a déjà authentifié et contrôlé la permission (voir `admin.routes.ts`).
 */

/** GET /api/admin/payments — liste paginée des paiements Mobile Money (payments.view). */
export async function adminPayments(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const status = readAdminQueryString(req, 'status')

  const where: Prisma.PaymentWhereInput = {}
  if (status === 'pending' || status === 'confirmed' || status === 'failed') {
    where.status = status
  }
  if (params.search) {
    where.OR = [
      { phone: { contains: params.search } },
      { operatorRef: { contains: params.search } },
    ]
  }

  const [rows, total, sumAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        provider: true,
        phone: true,
        amount: true,
        status: true,
        operatorRef: true,
        createdAt: true,
        resolvedAt: true,
        user: { select: { firstName: true, lastName: true, contact: true } },
        subscription: { select: { plan: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    phone: r.phone,
    amount: r.amount,
    status: r.status,
    operatorRef: r.operatorRef,
    createdAt: r.createdAt.getTime(),
    resolvedAt: r.resolvedAt?.getTime() ?? null,
    plan: r.subscription?.plan ?? null,
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
  }))

  res.json({ ...paginated(items, total, params), sumAmount: sumAgg._sum.amount ?? 0 })
}

const ESCROW_VALID_STATUS = new Set([
  'awaiting_payment',
  'in_escrow',
  'delivered',
  'released',
  'refunded',
  'disputed',
])

/** GET /api/admin/escrow — liste paginée des commandes en séquestre (escrow.view). */
export async function adminEscrow(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const status = readAdminQueryString(req, 'status')

  const where: Prisma.EscrowOrderWhereInput = {}
  if (ESCROW_VALID_STATUS.has(status)) {
    where.status = status as Prisma.EscrowOrderWhereInput['status']
  }
  if (params.search) {
    where.OR = [
      { id: { contains: params.search } },
      { clientId: { contains: params.search } },
      { providerId: { contains: params.search } },
    ]
  }

  const [rows, total, sumAgg] = await Promise.all([
    prisma.escrowOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        conversationId: true,
        clientId: true,
        providerId: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        releasedAt: true,
        disputedAt: true,
        disputeReason: true,
        cancelReason: true,
      },
    }),
    prisma.escrowOrder.count({ where }),
    prisma.escrowOrder.aggregate({ where, _sum: { amount: true } }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    clientId: r.clientId,
    providerId: r.providerId,
    amount: r.amount,
    status: r.status,
    createdAt: r.createdAt.getTime(),
    paidAt: r.paidAt?.getTime() ?? null,
    releasedAt: r.releasedAt?.getTime() ?? null,
    disputedAt: r.disputedAt?.getTime() ?? null,
    disputeReason: r.disputeReason,
    cancelReason: r.cancelReason,
  }))

  res.json({ ...paginated(items, total, params), sumAmount: sumAgg._sum.amount ?? 0 })
}

/** GET /api/admin/subscriptions — liste paginée des abonnements (subscriptions.view). */
export async function adminSubscriptions(req: Request, res: Response): Promise<void> {
  const params = readAdminListParams(req)
  const status = readAdminQueryString(req, 'status')

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

  res.json(paginated(items, total, params))
}
