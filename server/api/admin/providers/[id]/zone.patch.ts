import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { providerZoneSchema } from '~~/server/utils/apiValidationAdmin'
import { adminUpdateProviderZone } from '~~/server/utils/adminProviderStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Force la mise à jour de la zone géographique d'intervention d'un prestataire (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, providerZoneSchema)

  const profile = adminUpdateProviderZone(id, body)
  if (!profile) notFound('Profil prestataire introuvable.')
  await recordAuditLog({ actor: admin, action: 'provider.zone.update', targetType: 'user', targetId: id, metadata: body })
  return { profile }
})
