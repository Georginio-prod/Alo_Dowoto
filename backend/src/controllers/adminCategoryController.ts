import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { auditLogService } from '../services/auditLogService'
import {
  createPrealableQuestion,
  createSector,
  deletePrealableQuestion,
  listPrealableQuestions,
  listSectors,
  listSiteContent,
  renameSector,
  reorderSector,
  setSectorActive,
  updateSectorIcon,
  upsertSiteContent,
} from '../services/adminCategoryService'
import type { prealableQuestionSchema, sectorCreateSchema, sectorPatchSchema, siteContentSchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : catégories de service et contenu
 * éditorial (module 10). Portés iso depuis `server/api/admin/{categories,questions,
 * content}/**` (ADR-0017). Rôle admin, actions tracées. Le site public lit encore
 * la liste statique des secteurs : rebrancher est un chantier séparé.
 */

/** GET /api/admin/categories — catégories de service (avec sous-secteurs). */
export async function adminListCategories(_req: Request, res: Response): Promise<void> {
  res.json({ sectors: await listSectors() })
}

/** POST /api/admin/categories — crée une catégorie. */
export async function adminCreateCategory(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof sectorCreateSchema>
  const sector = await createSector(body)
  await auditLogService.recordAuditLog({ actor: admin, action: 'sector.create', targetType: 'sector', targetId: sector.id, metadata: { slug: body.slug } })
  res.json({ sector })
}

/** PATCH /api/admin/categories/:id — renomme / réordonne / (dés)active / change l'icône. */
export async function adminUpdateCategory(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof sectorPatchSchema>

  if (body.name !== undefined) await renameSector(id, body.name)
  if (body.active !== undefined) await setSectorActive(id, body.active)
  if (body.order !== undefined) await reorderSector(id, body.order)
  if (body.emoji !== undefined) await updateSectorIcon(id, body.emoji)

  await auditLogService.recordAuditLog({ actor: admin, action: 'sector.update', targetType: 'sector', targetId: id, metadata: body })
  res.json({ ok: true })
}

/** GET /api/admin/categories/:id/questions — questions de fiche préalable d'une catégorie. */
export async function adminListQuestions(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  res.json({ questions: await listPrealableQuestions(id) })
}

/** POST /api/admin/categories/:id/questions — ajoute une question de fiche préalable. */
export async function adminCreateQuestion(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof prealableQuestionSchema>

  const question = await createPrealableQuestion(id, body.label, body.required)
  await auditLogService.recordAuditLog({ actor: admin, action: 'prealable_question.create', targetType: 'sector', targetId: id })
  res.json({ question })
}

/** DELETE /api/admin/questions/:id — supprime une question de fiche préalable. */
export async function adminDeleteQuestion(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  await deletePrealableQuestion(id)
  await auditLogService.recordAuditLog({ actor: admin, action: 'prealable_question.delete', targetType: 'prealable_question', targetId: id })
  res.json({ ok: true })
}

/** GET /api/admin/content — blocs de contenu éditables. */
export async function adminListContent(_req: Request, res: Response): Promise<void> {
  res.json({ content: await listSiteContent() })
}

/** POST /api/admin/content — crée ou met à jour un bloc de contenu. */
export async function adminUpsertContent(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const body = req.body as z.infer<typeof siteContentSchema>
  const content = await upsertSiteContent(body.key, body.label, body.value)
  await auditLogService.recordAuditLog({ actor: admin, action: 'site_content.upsert', targetType: 'site_content', targetId: body.key })
  res.json({ content })
}
