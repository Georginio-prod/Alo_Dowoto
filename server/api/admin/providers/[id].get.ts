import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { getAdminProviderDetail } from '~~/server/utils/adminProviderStore'

/** Fiche détaillée d'un prestataire (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const detail = await getAdminProviderDetail(id)
  if (!detail) notFound('Prestataire introuvable.')
  return { provider: detail }
})
