import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { prisma } from '~~/server/utils/prisma'
import { sendAdminMessage } from '~~/server/utils/adminMessaging'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Relance le chercheur et le prestataire d'une mission bloquée (#dashboard-admin, module 4) — notification in-app aux deux parties. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const order = await prisma.escrowOrder.findUnique({ where: { id } })
  if (!order) notFound('Mission introuvable.')

  const title = 'Relance WorkTogo'
  const body = 'L’équipe WorkTogo vous invite à finaliser cette mission dès que possible.'
  await Promise.all([sendAdminMessage(order.clientId, title, body), sendAdminMessage(order.providerId, title, body)])
  await recordAuditLog({ actor: admin, action: 'mission.nudge', targetType: 'mission', targetId: id })
  return { ok: true }
})
