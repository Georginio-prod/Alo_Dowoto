import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { listCampaigns } from '~~/server/utils/adminCampaignStore'

/** Historique des campagnes (#dashboard-admin, module 11). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { campaigns: await listCampaigns() }
})
