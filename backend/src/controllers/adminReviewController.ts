import type { Request, Response } from 'express'
import type { z } from 'zod'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { readAdminQueryString } from '../utils/adminList'
import { reviewService } from '../services/reviewService'
import { sendAdminMessage } from '../services/adminMessagingService'
import { deleteReview, hideReview, listAdminReviews, restoreReview } from '../services/adminReviewService'
import { auditLogService } from '../services/auditLogService'
import type { adminMessageSchema, reasonBodySchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : modération des avis (module 8).
 * Portées iso depuis `server/api/admin/reviews/**` (ADR-0017). Rôle admin,
 * décisions tracées. Le masquage/suppression est durable (`ReviewModeration`).
 */

/** GET /api/admin/reviews — avis, signalés (auto/manuel) en tête (?flagged=1). */
export async function adminListReviews(req: Request, res: Response): Promise<void> {
  const onlyFlagged = readAdminQueryString(req, 'flagged') === '1'
  res.json({ reviews: await listAdminReviews(onlyFlagged) })
}

/** POST /api/admin/reviews/:id/hide — masque un avis (motif requis). */
export async function adminHideReview(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof reasonBodySchema>

  await hideReview(id, body.reason)
  await auditLogService.recordAuditLog({ actor: admin, action: 'review.hide', targetType: 'review', targetId: id, metadata: { reason: body.reason } })
  res.json({ ok: true })
}

/** POST /api/admin/reviews/:id/restore — restaure un avis masqué. */
export async function adminRestoreReview(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  await restoreReview(id)
  await auditLogService.recordAuditLog({ actor: admin, action: 'review.restore', targetType: 'review', targetId: id })
  res.json({ ok: true })
}

/** POST /api/admin/reviews/:id/delete — supprime un avis (motif requis, masquage définitif). */
export async function adminDeleteReview(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof reasonBodySchema>

  await deleteReview(id, body.reason)
  await auditLogService.recordAuditLog({ actor: admin, action: 'review.delete', targetType: 'review', targetId: id, metadata: { reason: body.reason } })
  res.json({ ok: true })
}

/** POST /api/admin/reviews/:id/contact-author — contacte l'auteur d'un avis (message in-app). */
export async function adminContactReviewAuthor(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof adminMessageSchema>

  const review = await reviewService.getReviewById(id)
  if (!review) notFound('Avis introuvable.')

  await sendAdminMessage(review.authorId, body.subject, body.body)
  await auditLogService.recordAuditLog({ actor: admin, action: 'review.contact_author', targetType: 'review', targetId: id })
  res.json({ ok: true })
}
