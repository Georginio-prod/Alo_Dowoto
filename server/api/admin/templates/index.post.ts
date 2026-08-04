import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { upsertMessageTemplate } from '~~/server/utils/adminCampaignStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({
  key: requiredTrimmed('La clé est requise.'),
  label: requiredTrimmed('Le libellé est requis.'),
  channel: requiredTrimmed('Le canal est requis.'),
  body: requiredTrimmed('Le contenu est requis.'),
  subject: z.string().trim().optional(),
})

/** Crée ou met à jour un modèle de message automatique (#dashboard-admin, module 11). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, schema)

  const template = await upsertMessageTemplate(body.key, body.label, body.channel, body.body, body.subject)
  await recordAuditLog({ actor: admin, action: 'template.upsert', targetType: 'message_template', targetId: body.key })
  return { template }
})
