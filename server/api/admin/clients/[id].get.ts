import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { getAdminClientDetail } from '~~/server/utils/adminClientStore'

/** Fiche détaillée d'un chercheur (#dashboard-admin, module 3). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const detail = await getAdminClientDetail(id)
  if (!detail) notFound('Chercheur introuvable.')
  return { client: detail }
})
