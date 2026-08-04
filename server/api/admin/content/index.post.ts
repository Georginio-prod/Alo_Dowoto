import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { upsertSiteContent } from '~~/server/utils/adminCategoryStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({
  key: requiredTrimmed('La clé est requise.'),
  label: requiredTrimmed('Le libellé est requis.'),
  value: z.string().trim(),
})

/** Crée ou met à jour un bloc de contenu (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, schema)

  const content = await upsertSiteContent(body.key, body.label, body.value)
  await recordAuditLog({ actor: admin, action: 'site_content.upsert', targetType: 'site_content', targetId: body.key })
  return { content }
})
