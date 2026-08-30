import type { Request, Response } from 'express'
import type { z } from 'zod'
import { prisma } from '../config/prisma'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { kycDecisionService } from '../services/kycDecisionService'
import { subscriptionService } from '../services/subscriptionService'
import { auditLogService } from '../services/auditLogService'
import type { kycApproveSchema, reasonBodySchema, subscriptionExtendSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : actions MUTANTES sur les prestataires
 * et leur vérification d'identité. Portées iso depuis
 * `server/api/admin/providers/[id]/{kyc-approve,kyc-reject,verify}.post.ts`
 * (ADR-0017). Chaque décision KYC est tracée au journal d'audit ; un refus
 * révoque réellement le badge « Vérifié ».
 */

/** POST /api/admin/providers/:id/kyc-approve — valide la vérification d'identité (rôle admin, tracé). */
export async function adminKycApprove(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof kycApproveSchema>

  const decision = await kycDecisionService.approveKyc(id, admin.id, body.note)
  await auditLogService.recordAuditLog({ actor: admin, action: 'kyc.approve', targetType: 'user', targetId: id })
  res.json({ decision })
}

/** POST /api/admin/providers/:id/kyc-reject — refuse la vérification (motif requis), révoque le badge (rôle admin, tracé). */
export async function adminKycReject(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof reasonBodySchema>

  const decision = await kycDecisionService.rejectKyc(id, admin.id, body.reason)
  await auditLogService.recordAuditLog({ actor: admin, action: 'kyc.reject', targetType: 'user', targetId: id, metadata: { reason: body.reason } })
  res.json({ decision })
}

/**
 * POST /api/admin/providers/:id/verify — bascule le drapeau `verified` du profil
 * prestataire (badge public). `id` est l'identifiant du ProviderProfile
 * (providers.verify). Corps `{ verified?: boolean }`, défaut : valider.
 */
export async function adminProviderVerify(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant prestataire manquant.')

  const body = req.body as { verified?: unknown }
  const verified = body?.verified !== false // défaut : valider

  const existing = await prisma.providerProfile.findUnique({ where: { id } })
  if (!existing) notFound('Profil prestataire introuvable.')

  const updated = await prisma.providerProfile.update({
    where: { id },
    data: { verified },
    select: { id: true, displayName: true, verified: true },
  })

  res.json({ ok: true, provider: updated })
}

/** POST /api/admin/providers/:id/subscription-cancel — annule l'abonnement du prestataire (rôle admin, tracé). `id` = userId. */
export async function adminProviderSubscriptionCancel(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const subscription = await subscriptionService.adminCancelSubscription(id)
  if (!subscription) notFound('Aucun abonnement pour ce prestataire.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'subscription.cancel', targetType: 'user', targetId: id })
  res.json({ subscription })
}

/** POST /api/admin/providers/:id/subscription-extend — prolonge l'abonnement du prestataire (rôle admin, tracé). `id` = userId. */
export async function adminProviderSubscriptionExtend(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof subscriptionExtendSchema>

  const subscription = await subscriptionService.adminExtendSubscription(id, body.durationDays)
  if (!subscription) notFound('Aucun abonnement pour ce prestataire.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'subscription.extend', targetType: 'user', targetId: id, metadata: { durationDays: body.durationDays } })
  res.json({ subscription })
}
