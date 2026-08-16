import { prisma } from '~~/server/utils/prisma'
import { PLANS, type PlanSlug } from '~~/app/data/plans'

/**
 * Gestion manuelle de l'abonnement d'un prestataire depuis le dashboard
 * (`subscriptions.manage`). Body : `{ action, plan?, days? }`.
 *
 *  - `grant`  : accorde/active un abonnement (formule `plan`, durée `days` ou
 *               la durée standard de la formule). Un compte n'a qu'un seul
 *               abonnement : on met à jour l'existant ou on en crée un.
 *  - `extend` : prolonge de `days` jours à partir de la fin courante (ou de
 *               maintenant si déjà expiré).
 *  - `cancel` : met fin à l'abonnement (statut `expire`, fin = maintenant).
 *
 * Réservé aux comptes prestataire (les clients n'ont pas d'abonnement).
 */
const DAY_MS = 24 * 60 * 60 * 1000
const PLAN_DURATION: Record<PlanSlug, number> = Object.fromEntries(
  PLANS.map((p) => [p.slug, p.durationDays]),
) as Record<PlanSlug, number>

export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'subscriptions.manage')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant utilisateur manquant.')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) notFound('Utilisateur introuvable.')
  if (target.role !== 'prestataire') {
    badRequest('Seul un compte prestataire peut avoir un abonnement.')
  }

  const body = await readBody<{ action?: unknown; plan?: unknown; days?: unknown }>(event)
  const action = body?.action
  const existing = await prisma.subscription.findFirst({ where: { userId: id } })
  const now = Date.now()

  if (action === 'grant') {
    const plan = body.plan
    if (plan !== 'mensuel' && plan !== 'trimestriel' && plan !== 'annuel') {
      badRequest('Formule invalide (mensuel, trimestriel ou annuel).')
    }
    const days = Number.isFinite(Number(body.days)) && Number(body.days) > 0 ? Number(body.days) : PLAN_DURATION[plan]
    const dates = { dateDebut: new Date(now), dateFin: new Date(now + days * DAY_MS) }
    const row = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: { plan, status: 'actif', isTrial: false, ...dates },
        })
      : await prisma.subscription.create({
          data: { userId: id, plan, status: 'actif', isTrial: false, ...dates },
        })
    return { ok: true, subscription: serialize(row) }
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
    return { ok: true, subscription: serialize(row) }
  }

  if (action === 'cancel') {
    if (!existing) badRequest('Aucun abonnement à annuler.')
    const row = await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'expire', dateFin: new Date(now) },
    })
    return { ok: true, subscription: serialize(row) }
  }

  badRequest('Action invalide (grant, extend ou cancel).')
})

function serialize(row: {
  id: string
  plan: string
  status: string
  isTrial: boolean
  dateDebut: Date | null
  dateFin: Date | null
}) {
  return {
    id: row.id,
    plan: row.plan,
    status: row.status,
    isTrial: row.isTrial,
    dateDebut: row.dateDebut?.getTime() ?? null,
    dateFin: row.dateFin?.getTime() ?? null,
  }
}
