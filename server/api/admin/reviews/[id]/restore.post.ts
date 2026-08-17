import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { restoreReview } from '~~/server/utils/adminReviewStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Restaure un avis masqué (#dashboard-admin, module 8). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  await restoreReview(id)
  await recordAuditLog({ actor: admin, action: 'review.restore', targetType: 'review', targetId: id })
  return { ok: true }
})
