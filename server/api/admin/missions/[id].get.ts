import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { getAdminMissionDetail } from '~~/server/utils/adminMissionStore'

/** Fiche détaillée d'une mission (#dashboard-admin, module 4). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const detail = await getAdminMissionDetail(id)
  if (!detail) notFound('Mission introuvable.')
  return { mission: detail }
})
