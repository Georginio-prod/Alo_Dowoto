import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { adminForceValidate } from '~~/server/utils/escrowOrderStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Force la validation (libération des fonds) d'une mission bloquée (#dashboard-admin, module 4). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const result = await adminForceValidate(id)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Mission introuvable.' : 'Statut incompatible avec la validation forcée.')
  await recordAuditLog({ actor: admin, action: 'mission.force_validate', targetType: 'mission', targetId: id })
  return { order: result.order }
})
