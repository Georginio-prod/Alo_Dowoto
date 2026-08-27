import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { adminMessageSchema } from '~~/server/utils/apiValidationAdmin'
import { getReviewById } from '~~/server/utils/reviewStore'
import { sendAdminMessage } from '~~/server/utils/adminMessaging'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Contacte l'auteur d'un avis (#dashboard-admin, module 8). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, adminMessageSchema)

  const review = await getReviewById(id)
  if (!review) notFound('Avis introuvable.')

  await sendAdminMessage(review.authorId, body.subject, body.body)
  await recordAuditLog({ actor: admin, action: 'review.contact_author', targetType: 'review', targetId: id })
  return { ok: true }
})
