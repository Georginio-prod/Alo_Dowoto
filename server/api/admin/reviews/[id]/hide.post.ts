import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { reasonBodySchema } from '~~/server/utils/apiValidationAdmin'
import { hideReview } from '~~/server/utils/adminReviewStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Masque un avis, motif obligatoire (#dashboard-admin, module 8). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, reasonBodySchema)

  await hideReview(id, body.reason)
  await recordAuditLog({ actor: admin, action: 'review.hide', targetType: 'review', targetId: id, metadata: { reason: body.reason } })
  return { ok: true }
})
