import type { Request, Response } from 'express'
import type { z } from 'zod'
import { prisma } from '../config/prisma'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { parseAdminPagination, readAdminQueryString } from '../utils/adminList'
import type { EscrowOrderStatus } from '../repositories/escrowOrderRepository'
import { listAllServiceRequests } from '../services/requestService'
import { listAdminMissions, getAdminMissionDetail, type AdminMissionFilters } from '../services/adminMissionService'
import { adminRefundOrder } from '../services/adminPaymentActionsService'
import { adminForceValidate, adminReassignOrder } from '../services/escrowOrderService'
import { addAdminNote } from '../services/adminNotesService'
import { sendAdminMessage } from '../services/adminMessagingService'
import { auditLogService } from '../services/auditLogService'
import type { missionNoteSchema, missionReassignSchema, reasonBodySchema } from '../validation/schemas/admin'

/**
 * Dashboard admin (#admin) — sous-lot 3 : missions (module 4). Une « mission »
 * est une commande en séquestre. Portées iso depuis `server/api/admin/missions/**`
 * (ADR-0017). Rôle admin, actions tracées ; réutilisent les primitives escrow.
 */

/** GET /api/admin/missions — liste paginée + brouillons (fiches préalables). */
export async function adminListMissions(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = parseAdminPagination(req.query)
  const status = readAdminQueryString(req, 'status')
  const filters: AdminMissionFilters = { status: status ? (status as EscrowOrderStatus) : undefined }

  const result = await listAdminMissions(filters, page, pageSize)
  const drafts = listAllServiceRequests().slice(0, 20)
  res.json({ ...result, page, pageSize, drafts: drafts.map((d) => ({ id: d.id, title: d.title, userId: d.userId, createdAt: d.createdAt })) })
}

/** GET /api/admin/missions/:id — fiche détaillée d'une mission. */
export async function adminMissionDetail(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const detail = await getAdminMissionDetail(id)
  if (!detail) notFound('Mission introuvable.')
  res.json({ mission: detail })
}

/** POST /api/admin/missions/:id/cancel — annule (remboursement intégral), motif requis. */
export async function adminMissionCancel(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof reasonBodySchema>

  const result = await adminRefundOrder(id, body.reason)
  if (!result.ok) {
    badRequest(result.error === 'not_found' ? 'Mission introuvable.' : result.error === 'reason_required' ? 'Motif requis.' : 'Statut incompatible avec l’annulation.')
  }
  await auditLogService.recordAuditLog({ actor: admin, action: 'mission.cancel', targetType: 'mission', targetId: id, metadata: { reason: body.reason } })
  res.json({ ok: true })
}

/** POST /api/admin/missions/:id/force-validate — force la libération des fonds. */
export async function adminMissionForceValidate(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const result = await adminForceValidate(id)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Mission introuvable.' : 'Statut incompatible avec la validation forcée.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'mission.force_validate', targetType: 'mission', targetId: id })
  res.json({ order: result.order })
}

/** POST /api/admin/missions/:id/note — ajoute une note interne (équipe seulement). */
export async function adminMissionNote(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof missionNoteSchema>

  const authorLabel = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || admin.username
  await addAdminNote('mission', id, admin.id, authorLabel, body.body)
  await auditLogService.recordAuditLog({ actor: admin, action: 'mission.note.add', targetType: 'mission', targetId: id })
  res.json({ ok: true })
}

/** POST /api/admin/missions/:id/nudge — relance les deux parties (notification in-app). */
export async function adminMissionNudge(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const order = await prisma.escrowOrder.findUnique({ where: { id } })
  if (!order) notFound('Mission introuvable.')

  const title = 'Relance WorkTogo'
  const body = 'L’équipe WorkTogo vous invite à finaliser cette mission dès que possible.'
  await Promise.all([sendAdminMessage(order.clientId, title, body), sendAdminMessage(order.providerId, title, body)])
  await auditLogService.recordAuditLog({ actor: admin, action: 'mission.nudge', targetType: 'mission', targetId: id })
  res.json({ ok: true })
}

/** POST /api/admin/missions/:id/reassign — réassigne à un autre prestataire. */
export async function adminMissionReassign(req: Request, res: Response): Promise<void> {
  const admin = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')
  const body = req.body as z.infer<typeof missionReassignSchema>

  const result = await adminReassignOrder(id, body.providerId)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Mission introuvable.' : 'Statut incompatible avec la réassignation.')
  await auditLogService.recordAuditLog({ actor: admin, action: 'mission.reassign', targetType: 'mission', targetId: id, metadata: { newProviderId: body.providerId } })
  res.json({ order: result.order })
}
