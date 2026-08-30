import type { Request, Response } from 'express'
import type { z } from 'zod'
import { prisma } from '../config/prisma'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { hashPassword } from '../utils/password'
import { getPlanConfig } from '../data/plans'
import { reactivateUser, setAdminLevel, setUserRiskFlag, suspendUser } from '../services/adminUserActionsService'
import { auditLogService } from '../services/auditLogService'
import type { riskFlagSchema, teamLevelSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : actions MUTANTES sur les comptes.
 * Portées iso depuis `server/api/admin/users/[id]/**` (ADR-0017). Suspension,
 * réactivation, réinitialisation de mot de passe, marquage « à risque »,
 * suppression définitive, gestion manuelle d'abonnement. Chaque action sensible
 * est tracée au journal d'audit ; garde-fous anti-lockout inclus.
 */
const DAY_MS = 24 * 60 * 60 * 1000

/** POST /api/admin/users/:id/suspend — suspend ou réactive (users.suspend, tracé). */
export async function adminSuspendUser(req: Request, res: Response): Promise<void> {
  const me = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if (target.id === me.id) badRequest('Vous ne pouvez pas suspendre votre propre compte.')

  const body = req.body as { suspended?: unknown; reason?: unknown }
  const suspended = body && typeof body === 'object' && 'suspended' in body ? body.suspended === true : true
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  const user = suspended
    ? await suspendUser(id, reason || 'Suspension administrative.')
    : await reactivateUser(id)

  await auditLogService.recordAuditLog({
    actor: me,
    action: suspended ? 'user.suspend' : 'user.reactivate',
    targetType: 'user',
    targetId: id,
    metadata: { reason },
  })

  res.json({ ok: true, suspended, user })
}

/** POST /api/admin/users/:id/reactivate — réactive un compte suspendu (rôle admin, tracé). */
export async function adminReactivateUser(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const user = await reactivateUser(id)
  await auditLogService.recordAuditLog({ actor: admin, action: 'user.reactivate', targetType: 'user', targetId: id })
  res.json({ user })
}

/** POST /api/admin/users/:id/password — réinitialise le mot de passe (users.password), coupe les sessions. */
export async function adminResetPassword(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if ((target.role as string) === 'admin') {
    badRequest('Le mot de passe d’un administrateur se gère depuis la section Administrateurs.')
  }

  const body = req.body as { password?: unknown }
  const password = typeof body?.password === 'string' ? body.password : ''
  if (password.length < 8) badRequest('Le mot de passe doit contenir au moins 8 caractères.')

  const passwordHash = await hashPassword(password)
  await prisma.user.update({ where: { id }, data: { passwordHash } })
  await prisma.session.deleteMany({ where: { userId: id } })

  res.json({ ok: true })
}

/** POST /api/admin/users/:id/risk-flag — marque/retire « à risque » (rôle admin, tracé). */
export async function adminSetRiskFlag(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof riskFlagSchema>

  const user = await setUserRiskFlag(id, body.riskFlag, body.note)
  await auditLogService.recordAuditLog({
    actor: admin,
    action: body.riskFlag ? 'user.risk_flag.set' : 'user.risk_flag.clear',
    targetType: 'user',
    targetId: id,
    metadata: { note: body.note },
  })
  res.json({ user })
}

/** POST /api/admin/team/:id/level — change le niveau d'accès d'un membre de l'équipe (rôle admin, tracé). */
export async function adminTeamSetLevel(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof teamLevelSchema>

  const user = await setAdminLevel(id, body.level)
  await auditLogService.recordAuditLog({ actor: admin, action: 'team.level.update', targetType: 'user', targetId: id, metadata: { level: body.level } })
  res.json({ user })
}

/** DELETE /api/admin/users/:id — suppression définitive, transactionnelle (users.delete). */
export async function adminDeleteUser(req: Request, res: Response): Promise<void> {
  const me = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, firstName: true, lastName: true, contact: true },
  })
  if (!target) notFound('Utilisateur introuvable.')
  if (target.id === me.id) badRequest('Vous ne pouvez pas supprimer votre propre compte.')

  if ((target.role as string) === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } })
    if (adminCount <= 1) badRequest('Impossible de supprimer le dernier administrateur.')
  }

  await prisma.$transaction(async (tx) => {
    // Avis rédigés (authorId) et reçus (targetId = id utilisateur du noté).
    await tx.review.deleteMany({ where: { authorId: id } })
    await tx.review.deleteMany({ where: { targetId: id } })
    await tx.providerProfile.deleteMany({ where: { userId: id } })
    // Paiements puis abonnements (les paiements référencent l'abonnement).
    await tx.payment.deleteMany({ where: { userId: id } })
    await tx.subscription.deleteMany({ where: { userId: id } })
    // Compte : sessions et parrainages partent en cascade.
    await tx.user.delete({ where: { id } })
  })

  res.json({ ok: true, deleted: { id: target.id, name: `${target.firstName} ${target.lastName}`.trim() || target.contact } })
}

/** POST /api/admin/users/:id/subscription — gestion manuelle d'abonnement prestataire (subscriptions.manage). */
export async function adminManageSubscription(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if (target.role !== 'prestataire') badRequest('Seul un compte prestataire peut avoir un abonnement.')

  const body = req.body as { action?: unknown; plan?: unknown; days?: unknown }
  const action = body?.action
  const existing = await prisma.subscription.findFirst({ where: { userId: id } })
  const now = Date.now()

  if (action === 'grant') {
    const plan = body.plan
    if (plan !== 'mensuel' && plan !== 'trimestriel' && plan !== 'annuel') {
      badRequest('Formule invalide (mensuel, trimestriel ou annuel).')
    }
    const standardDays = getPlanConfig(plan)?.durationDays ?? 30
    const days = Number.isFinite(Number(body.days)) && Number(body.days) > 0 ? Number(body.days) : standardDays
    const dates = { dateDebut: new Date(now), dateFin: new Date(now + days * DAY_MS) }
    const row = existing
      ? await prisma.subscription.update({ where: { id: existing.id }, data: { plan, status: 'actif', isTrial: false, ...dates } })
      : await prisma.subscription.create({ data: { userId: id, plan, status: 'actif', isTrial: false, ...dates } })
    res.json({ ok: true, subscription: serializeSubscription(row) })
    return
  }

  if (action === 'extend') {
    if (!existing) badRequest('Aucun abonnement à prolonger.')
    const days = Number(body.days)
    if (!Number.isFinite(days) || days <= 0) badRequest('Nombre de jours invalide.')
    const base = Math.max(now, existing.dateFin?.getTime() ?? now)
    const row = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'actif', dateFin: new Date(base + days * DAY_MS), dateDebut: existing.dateDebut ?? new Date(now) },
    })
    res.json({ ok: true, subscription: serializeSubscription(row) })
    return
  }

  if (action === 'cancel') {
    if (!existing) badRequest('Aucun abonnement à annuler.')
    const row = await prisma.subscription.update({ where: { id: existing.id }, data: { status: 'expire', dateFin: new Date(now) } })
    res.json({ ok: true, subscription: serializeSubscription(row) })
    return
  }

  badRequest('Action invalide (grant, extend ou cancel).')
}

function serializeSubscription(row: { id: string; plan: string; status: string; isTrial: boolean; dateDebut: Date | null; dateFin: Date | null }) {
  return {
    id: row.id,
    plan: row.plan,
    status: row.status,
    isTrial: row.isTrial,
    dateDebut: row.dateDebut?.getTime() ?? null,
    dateFin: row.dateFin?.getTime() ?? null,
  }
}
