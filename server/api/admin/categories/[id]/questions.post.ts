import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { createPrealableQuestion } from '~~/server/utils/adminCategoryStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const schema = z.object({ label: requiredTrimmed('La question est requise.'), required: z.boolean().default(true) })

/** Ajoute une question de fiche préalable à une catégorie (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, schema)

  const question = await createPrealableQuestion(id, body.label, body.required)
  await recordAuditLog({ actor: admin, action: 'prealable_question.create', targetType: 'sector', targetId: id })
  return { question }
})
