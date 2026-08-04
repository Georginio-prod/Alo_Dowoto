import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { deletePrealableQuestion } from '~~/server/utils/adminCategoryStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Supprime une question de fiche préalable (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  await deletePrealableQuestion(id)
  await recordAuditLog({ actor: admin, action: 'prealable_question.delete', targetType: 'prealable_question', targetId: id })
  return { ok: true }
})
