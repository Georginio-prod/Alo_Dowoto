import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { adminMessageSchema } from '~~/server/utils/apiValidationAdmin'
import { sendAdminMessage } from '~~/server/utils/adminMessaging'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Envoie un message direct (notification in-app) à un utilisateur (#dashboard-admin, modules 2/3). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, adminMessageSchema)

  await sendAdminMessage(id, body.subject, body.body)
  await recordAuditLog({ actor: admin, action: 'user.message', targetType: 'user', targetId: id, metadata: { subject: body.subject } })
  return { ok: true }
})
