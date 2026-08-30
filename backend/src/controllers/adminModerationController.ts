import type { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { authUser } from '../utils/authUser'
import { badRequest, notFound } from '../utils/apiError'

/**
 * Dashboard admin (#admin) — sous-lot 3 : modération & support (mutations).
 * Portées iso depuis `server/api/admin/{testimonials/[id].patch,testimonials/[id].delete,
 * complaints/[id].patch,announcements.post}` (ADR-0017). Prisma-direct : masquage/
 * suppression d'un témoignage, traitement d'une réclamation (note interne jamais
 * exposée), diffusion d'une annonce in-app.
 */

/** PATCH /api/admin/testimonials/:id — masque ou réaffiche un témoignage (testimonials.moderate). */
export async function adminTestimonialSetHidden(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant de témoignage manquant.')

  const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } })
  if (!existing) notFound('Témoignage introuvable.')

  const body = req.body as { hidden?: unknown }
  const hidden = body?.hidden === true

  await prisma.testimonial.update({ where: { id }, data: { hidden } })
  res.json({ ok: true, hidden })
}

/** DELETE /api/admin/testimonials/:id — supprime définitivement un témoignage réel (testimonials.moderate). */
export async function adminTestimonialDelete(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant de témoignage manquant.')

  const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } })
  if (!existing) notFound('Témoignage introuvable.')

  await prisma.testimonial.delete({ where: { id } })
  res.json({ ok: true })
}

/** PATCH /api/admin/complaints/:id — traite une réclamation, statut + note interne (complaints.manage). */
export async function adminComplaintUpdate(req: Request, res: Response): Promise<void> {
  const me = authUser(req)
  const id = req.params.id
  if (!id) badRequest('Identifiant de réclamation manquant.')

  const existing = await prisma.complaint.findUnique({ where: { id }, select: { id: true } })
  if (!existing) notFound('Réclamation introuvable.')

  const body = req.body as { status?: unknown; adminNote?: unknown }
  const data: { status?: string; adminNote?: string; handledAt?: Date | null; handledById?: string | null } = {}

  if (body?.status !== undefined) {
    if (body.status !== 'nouveau' && body.status !== 'en_cours' && body.status !== 'resolu') {
      badRequest('Statut invalide (nouveau, en_cours ou resolu).')
    }
    data.status = body.status
    if (body.status === 'resolu') {
      data.handledAt = new Date()
      data.handledById = me.id
    } else {
      data.handledAt = null
      data.handledById = null
    }
  }

  if (typeof body?.adminNote === 'string') {
    data.adminNote = body.adminNote.trim()
  }

  if (Object.keys(data).length === 0) badRequest('Aucune modification fournie.')

  const updated = await prisma.complaint.update({
    where: { id },
    data,
    select: { id: true, status: true, adminNote: true, handledAt: true },
  })

  res.json({
    ok: true,
    complaint: { id: updated.id, status: updated.status, adminNote: updated.adminNote, handledAt: updated.handledAt?.getTime() ?? null },
  })
}

/** POST /api/admin/announcements — diffuse une annonce in-app (notifications.send). */
export async function adminAnnounce(req: Request, res: Response): Promise<void> {
  const body = req.body as { target?: unknown; userId?: unknown; title?: unknown; body?: unknown }
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const message = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!title || !message) badRequest('Titre et message requis.')

  const target = body?.target
  let userIds: string[] = []

  if (target === 'user') {
    const uid = typeof body?.userId === 'string' ? body.userId : ''
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { id: true } })
    if (!u) badRequest('Destinataire introuvable.')
    userIds = [u.id]
  } else if (target === 'clients' || target === 'prestataires') {
    const role = target === 'clients' ? 'client' : 'prestataire'
    const rows = await prisma.user.findMany({ where: { role }, select: { id: true } })
    userIds = rows.map((r) => r.id)
  } else if (target === 'all') {
    const rows = await prisma.user.findMany({ where: { role: { in: ['client', 'prestataire'] } }, select: { id: true } })
    userIds = rows.map((r) => r.id)
  } else {
    badRequest('Cible invalide (all, clients, prestataires ou user).')
  }

  if (userIds.length === 0) {
    res.json({ ok: true, sent: 0 })
    return
  }

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type: 'admin_message' as const, title, body: message })),
  })

  res.json({ ok: true, sent: userIds.length })
}
