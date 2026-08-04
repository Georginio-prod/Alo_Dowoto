import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listPrealableQuestions } from '~~/server/utils/adminCategoryStore'

/** Questions de fiche préalable d'une catégorie (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  return { questions: await listPrealableQuestions(id) }
})
