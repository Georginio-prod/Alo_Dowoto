import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { auditLogService } from '../services/auditLogService'
import {
  createCoupon,
  createPlanConfig,
  listCoupons,
  listPlanConfigs,
  setCouponActive,
  setPlanConfigActive,
  updatePlanConfig,
} from '../services/adminPlanService'
import { getPlatformSettings, updatePlatformSettings } from '../services/adminSettingsService'
import type {
  couponCreateSchema,
  planCreateSchema,
  planPatchSchema,
  settingsPatchSchema,
  toggleActiveSchema,
} from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : catalogue tarifaire (module 7).
 * Formules d'abonnement configurables, codes promo et réglages généraux, portés
 * iso depuis `server/api/admin/{plans,coupons,settings}/**` (ADR-0017). Toutes
 * ces routes sont réservées au rôle admin et tracées au journal d'audit.
 */

/** GET /api/admin/plans — formules configurées. */
export async function adminListPlans(_req: Request, res: Response): Promise<void> {
  res.json({ plans: await listPlanConfigs() })
}

/** POST /api/admin/plans — crée une formule. */
export async function adminCreatePlan(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof planCreateSchema>
  const plan = await createPlanConfig({ ...body, active: true })
  await auditLogService.recordAuditLog({ actor: admin, action: 'plan.create', targetType: 'plan', targetId: plan.id, metadata: { slug: body.slug } })
  res.json({ plan })
}

/** PATCH /api/admin/plans/:id — modifie une formule. */
export async function adminUpdatePlan(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof planPatchSchema>
  const plan = await updatePlanConfig(id, body)
  await auditLogService.recordAuditLog({ actor: admin, action: 'plan.update', targetType: 'plan', targetId: id, metadata: body })
  res.json({ plan })
}

/** POST /api/admin/plans/:id/toggle — active/désactive une formule. */
export async function adminTogglePlan(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof toggleActiveSchema>
  const plan = await setPlanConfigActive(id, body.active)
  await auditLogService.recordAuditLog({ actor: admin, action: body.active ? 'plan.enable' : 'plan.disable', targetType: 'plan', targetId: id })
  res.json({ plan })
}

/** GET /api/admin/coupons — codes promo. */
export async function adminListCoupons(_req: Request, res: Response): Promise<void> {
  res.json({ coupons: await listCoupons() })
}

/** POST /api/admin/coupons — crée un code promo. */
export async function adminCreateCoupon(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof couponCreateSchema>
  const coupon = await createCoupon(body)
  await auditLogService.recordAuditLog({ actor: admin, action: 'coupon.create', targetType: 'coupon', targetId: coupon.id, metadata: { code: body.code } })
  res.json({ coupon })
}

/** POST /api/admin/coupons/:id/toggle — active/désactive un code promo. */
export async function adminToggleCoupon(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof toggleActiveSchema>
  const coupon = await setCouponActive(id, body.active)
  await auditLogService.recordAuditLog({ actor: admin, action: body.active ? 'coupon.enable' : 'coupon.disable', targetType: 'coupon', targetId: id })
  res.json({ coupon })
}

/** GET /api/admin/settings — réglages généraux. */
export async function adminGetSettings(_req: Request, res: Response): Promise<void> {
  res.json({ settings: await getPlatformSettings() })
}

/** PATCH /api/admin/settings — met à jour les réglages généraux. */
export async function adminUpdateSettings(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof settingsPatchSchema>
  const settings = await updatePlatformSettings(body)
  await auditLogService.recordAuditLog({ actor: admin, action: 'settings.update', targetType: 'platform_settings', metadata: body })
  res.json({ settings })
}
