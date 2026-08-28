import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { optionalReasonBodySchema } from '~~/server/utils/apiValidationAdmin'
import { anonymizeUser } from '~~/server/utils/userStore'
import { deleteVerification } from '~~/server/utils/verificationStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/**
 * Supprime un compte (prestataire ou chercheur) depuis l'admin — même
 * anonymisation que le droit à l'effacement self-service (#286,
 * server/api/account/delete.post.ts) : l'historique financier est conservé
 * (obligations comptables/fiscales) mais n'est plus rattachable à une
 * identité réelle. Confirmation explicite exigée côté client
 * (AdminConfirmModal) avant cet appel, action irréversible.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, optionalReasonBodySchema)

  await deleteVerification(id)
  await anonymizeUser(id)
  await recordAuditLog({ actor: admin, action: 'user.delete', targetType: 'user', targetId: id, metadata: { reason: body.reason } })
  return { ok: true }
})
