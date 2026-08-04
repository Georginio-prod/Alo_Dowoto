import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { requiredTrimmed } from '~~/server/utils/apiValidation'
import { addAdminNote } from '~~/server/utils/adminNotes'
import { recordAuditLog } from '~~/server/utils/auditLog'

const noteSchema = z.object({ body: requiredTrimmed('La note ne peut pas être vide.') })

/** Ajoute une note interne sur une mission, visible seulement par l'équipe (#dashboard-admin, module 4). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, noteSchema)

  const authorLabel = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || admin.username
  await addAdminNote('mission', id, admin.id, authorLabel, body.body)
  await recordAuditLog({ actor: admin, action: 'mission.note.add', targetType: 'mission', targetId: id })
  return { ok: true }
})
