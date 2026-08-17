import { prisma } from '~~/server/utils/prisma'

/**
 * Traite une réclamation depuis le dashboard (`complaints.manage`). Body :
 * `{ status?, adminNote? }`. `status` ∈ nouveau | en_cours | resolu. Passer à
 * `resolu` (ou repasser à un autre statut) mémorise qui a traité et quand.
 * `adminNote` est une note interne de support (jamais exposée publiquement).
 */
export default defineEventHandler(async (event) => {
  const me = await requireAdminPermission(event, 'complaints.manage')

  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant de réclamation manquant.')

  const existing = await prisma.complaint.findUnique({ where: { id }, select: { id: true } })
  if (!existing) notFound('Réclamation introuvable.')

  const body = await readBody<{ status?: unknown; adminNote?: unknown }>(event)
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

  if (Object.keys(data).length === 0) {
    badRequest('Aucune modification fournie.')
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data,
    select: { id: true, status: true, adminNote: true, handledAt: true },
  })

  return {
    ok: true,
    complaint: {
      id: updated.id,
      status: updated.status,
      adminNote: updated.adminNote,
      handledAt: updated.handledAt?.getTime() ?? null,
    },
  }
})
