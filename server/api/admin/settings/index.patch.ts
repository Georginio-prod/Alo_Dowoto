import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { updatePlatformSettings } from '~~/server/utils/adminSettingsStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const settingsSchema = z.object({
  geoRadiusKm: z.number().int().positive().optional(),
  autoValidationDelayHours: z.number().int().positive().optional(),
  retractationDelayHours: z.number().int().positive().optional(),
  currency: z.string().trim().optional(),
  language: z.string().trim().optional(),
  minAdvanceAmount: z.number().int().positive().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
})

/** Met à jour les réglages généraux (#dashboard-admin, modules 7 et 12). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, settingsSchema)

  const settings = await updatePlatformSettings(body)
  await recordAuditLog({ actor: admin, action: 'settings.update', targetType: 'platform_settings', metadata: body })
  return { settings }
})
