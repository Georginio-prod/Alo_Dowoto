import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { providerCategorySchema } from '~~/server/utils/apiValidationAdmin'
import { adminUpdateProviderCategories } from '~~/server/utils/adminProviderStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Modifie la catégorie de service autorisée d'un prestataire (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, providerCategorySchema)

  const profile = adminUpdateProviderCategories(id, body.sector)
  if (!profile) notFound('Profil prestataire introuvable.')
  await recordAuditLog({ actor: admin, action: 'provider.categories.update', targetType: 'user', targetId: id, metadata: { sector: body.sector } })
  return { profile }
})
