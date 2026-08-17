import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listMessageTemplates } from '~~/server/utils/adminCampaignStore'

/** Modèles de messages automatiques (#dashboard-admin, module 11). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { templates: await listMessageTemplates() }
})
