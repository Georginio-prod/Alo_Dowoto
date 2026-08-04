import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { renameSector, setSectorActive, reorderSector, updateSectorIcon } from '~~/server/utils/adminCategoryStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

const patchSchema = z.object({
  name: z.string().trim().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  emoji: z.string().trim().optional(),
})

/** Renomme / réordonne / désactive / change l'icône d'une catégorie (#dashboard-admin, module 10). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, patchSchema)

  if (body.name !== undefined) await renameSector(id, body.name)
  if (body.active !== undefined) await setSectorActive(id, body.active)
  if (body.order !== undefined) await reorderSector(id, body.order)
  if (body.emoji !== undefined) await updateSectorIcon(id, body.emoji)

  await recordAuditLog({ actor: admin, action: 'sector.update', targetType: 'sector', targetId: id, metadata: body })
  return { ok: true }
})
