import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { adminReassignOrder } from '~~/server/utils/escrowOrderStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const reassignSchema = z.object({ providerId: requiredTrimmed('Le prestataire de remplacement est requis.') })

/** Réassigne une mission bloquée à un autre prestataire (#dashboard-admin, module 4). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, reassignSchema)

  const result = await adminReassignOrder(id, body.providerId)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Mission introuvable.' : 'Statut incompatible avec la réassignation.')
  await recordAuditLog({ actor: admin, action: 'mission.reassign', targetType: 'mission', targetId: id, metadata: { newProviderId: body.providerId } })
  return { order: result.order }
})
