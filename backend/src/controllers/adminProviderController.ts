import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { adminUpdateProviderCategories, adminUpdateProviderZone, getAdminProviderDetail } from '../services/adminProviderService'
import { auditLogService } from '../services/auditLogService'
import type { providerCategorySchema, providerZoneSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — module 2 : comptes prestataire. Portées iso depuis
 * `server/api/admin/providers/{[id].get,[id]/zone.patch,[id]/categories.patch}`
 * (ADR-0017) : fiche détaillée (lecture) et actions tracées de forçage de la zone
 * géographique et de la catégorie de service.
 */

/** GET /api/admin/providers/:id — fiche détaillée d'un prestataire (rôle admin). */
export async function adminProviderDetail(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const detail = await getAdminProviderDetail(id)
  if (!detail) notFound('Prestataire introuvable.')
  res.json({ provider: detail })
}

/** PATCH /api/admin/providers/:id/zone — force la zone géographique d'intervention (rôle admin, tracé). */
export async function adminSetProviderZone(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof providerZoneSchema>

  const profile = await adminUpdateProviderZone(id, body)
  if (!profile) notFound('Profil prestataire introuvable.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'provider.zone.update', targetType: 'user', targetId: id, metadata: body })
  res.json({ profile })
}

/** PATCH /api/admin/providers/:id/categories — force la catégorie de service autorisée (rôle admin, tracé). */
export async function adminSetProviderCategories(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof providerCategorySchema>

  const profile = await adminUpdateProviderCategories(id, body.sector)
  if (!profile) notFound('Profil prestataire introuvable.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'provider.categories.update', targetType: 'user', targetId: id, metadata: { sector: body.sector } })
  res.json({ profile })
}
