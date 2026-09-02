import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { readAdminQueryString } from '../utils/adminList'
import { authUser } from '../utils/authUser'
import { forbidden } from '../utils/apiError'
import { getAdminPermissions, hasPermission } from '../services/adminPermissionsService'
import { auditLogService } from '../services/auditLogService'
import { exportMovementsCsv, type AdminMovementFilters, type AdminMovementKind } from '../services/adminMovementService'

/**
 * Dashboard admin (#admin) — exports « toutes lignes filtrées » pour la
 * génération de CSV côté client. Portés iso depuis
 * `server/api/admin/{users,payments,escrow,subscriptions}/export.get.ts`
 * (ADR-0017). Sauf le CSV natif des mouvements (module 5), ces routes renvoient
 * `{ items, total }` (le client fabrique le CSV). Bornés à 50 000 lignes.
 */

/** GET /api/admin/users/export — comptes filtrés (users.view). Jamais de hash de mot de passe. */
export async function adminUsersExport(req: Request, res: Response): Promise<void> {
  const search = readAdminQueryString(req, 'search')
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

  res.json({ items, total: items.length })
}

/**
 * GET /api/admin/payments/export — DEUX formats sur la même route (iso Nitro) :
 *  - `?format=csv` (ou `Accept: text/csv`) → CSV des mouvements (rôle admin, tracé) ;
 *  - sinon → JSON `{ items, total }` (permission `payments.view`), CSV côté client.
 * La route est montée avec `requireAdminRole` ; la permission fine du branchement
 * JSON est vérifiée ici, comme dans le handler Nitro d'origine.
 */
export async function adminPaymentsExport(req: Request, res: Response): Promise<void> {
  const format = readAdminQueryString(req, 'format')
  const wantsCsv = format === 'csv' || (req.get('accept') ?? '').includes('text/csv')

  if (wantsCsv) {
    const admin = authUser(req)
    const kind = readAdminQueryString(req, 'kind')
    const status = readAdminQueryString(req, 'status')
    const method = readAdminQueryString(req, 'method')
    const from = readAdminQueryString(req, 'from')
    const to = readAdminQueryString(req, 'to')
    const filters: AdminMovementFilters = {
      kind: kind ? (kind as AdminMovementKind) : undefined,
      status: status || undefined,
      method: method || undefined,
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
    }
    const csv = await exportMovementsCsv(filters)
    await auditLogService.recordAuditLog({ actor: admin, action: 'payments.export', targetType: 'payments', metadata: { ...filters } })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="paiements.csv"')
    res.send(csv)
    return
  }

  // --- Format JSON (dashboard desktop) : permission fine requise ---
  const perms = await getAdminPermissions(authUser(req).id)
  if (!hasPermission(perms, 'payments.view')) forbidden('Permission insuffisante pour cette action.')

  const search = readAdminQueryString(req, 'search')
  const status = readAdminQueryString(req, 'status')

  const where: Prisma.PaymentWhereInput = {}
  if (status === 'pending' || status === 'confirmed' || status === 'failed') {
    where.status = status
  }
  if (search) {
    where.OR = [{ phone: { contains: search } }, { operatorRef: { contains: search } }]
  }

  const rows = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
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
  })

  const items = rows.map((r) => ({
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
    provider: r.provider,
    phone: r.phone,
    amount: r.amount,
    status: r.status,
    plan: r.subscription?.plan ?? null,
    operatorRef: r.operatorRef,
    createdAt: r.createdAt.getTime(),
    resolvedAt: r.resolvedAt?.getTime() ?? null,
  }))

  res.json({ items, total: items.length })
}

const ESCROW_VALID_STATUS = new Set(['awaiting_payment', 'in_escrow', 'delivered', 'released', 'refunded', 'disputed'])

/** GET /api/admin/escrow/export — commandes en séquestre filtrées (escrow.view). */
export async function adminEscrowExport(req: Request, res: Response): Promise<void> {
  const search = readAdminQueryString(req, 'search')
  const status = readAdminQueryString(req, 'status')

  const where: Prisma.EscrowOrderWhereInput = {}
  if (ESCROW_VALID_STATUS.has(status)) {
    where.status = status as Prisma.EscrowOrderWhereInput['status']
  }
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { clientId: { contains: search } },
      { providerId: { contains: search } },
    ]
  }

  const rows = await prisma.escrowOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
      id: true,
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
  })

  const items = rows.map((r) => ({
    id: r.id,
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

  res.json({ items, total: items.length })
}

/** GET /api/admin/subscriptions/export — abonnements filtrés (subscriptions.view). */
export async function adminSubscriptionsExport(req: Request, res: Response): Promise<void> {
  const search = readAdminQueryString(req, 'search')
  const status = readAdminQueryString(req, 'status')

  const where: Prisma.SubscriptionWhereInput = {}
  if (status === 'en_attente' || status === 'actif' || status === 'expire') {
    where.status = status
  }
  if (search) {
    where.plan = { contains: search }
  }

  const rows = await prisma.subscription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50000,
    select: {
      plan: true,
      status: true,
      isTrial: true,
      dateDebut: true,
      dateFin: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, contact: true } },
    },
  })

  const items = rows.map((r) => ({
    userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
    userContact: r.user?.contact ?? null,
    plan: r.plan,
    status: r.status,
    isTrial: r.isTrial,
    dateDebut: r.dateDebut?.getTime() ?? null,
    dateFin: r.dateFin?.getTime() ?? null,
    createdAt: r.createdAt.getTime(),
  }))

  res.json({ items, total: items.length })
}
