import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listSiteContent } from '~~/server/utils/adminCategoryStore'

/** Blocs de contenu éditables (accueil, FAQ, CGU) (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { content: await listSiteContent() }
})
