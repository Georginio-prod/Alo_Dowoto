import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { getPlatformSettings } from '~~/server/utils/adminSettingsStore'

/** Réglages généraux de la plateforme (#dashboard-admin, modules 7 et 12). */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  return { settings: await getPlatformSettings() }
})
