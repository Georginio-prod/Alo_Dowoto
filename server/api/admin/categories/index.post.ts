import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody, requiredTrimmed } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { createSector } from '~~/server/utils/adminCategoryStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const sectorSchema = z.object({
  slug: requiredTrimmed('Le slug est requis.'),
  name: requiredTrimmed('Le nom est requis.'),
  emoji: z.string().trim().default('🛠️'),
  color: z.string().trim().default('#14A800'),
  ink: z.string().trim().default('#0F2318'),
})

/** Crée une catégorie de service (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const body = await readSchemaBody(event, sectorSchema)

  const sector = await createSector(body)
  await recordAuditLog({ actor: admin, action: 'sector.create', targetType: 'sector', targetId: sector.id, metadata: { slug: body.slug } })
  return { sector }
})
