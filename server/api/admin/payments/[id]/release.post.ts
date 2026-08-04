import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { adminReleaseFunds } from '~~/server/utils/adminPaymentActions'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Libère manuellement les fonds séquestrés d'une commande (#dashboard-admin, module 5). `id` = identifiant de la commande en séquestre. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const result = await adminReleaseFunds(id)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Commande introuvable.' : 'Statut incompatible avec la libération.')
  await recordAuditLog({ actor: admin, action: 'payment.release', targetType: 'escrow_order', targetId: id })
  return { ok: true }
})
