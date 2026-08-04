import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { sendAdminMessage } from '~~/server/utils/adminMessaging'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Envoie un avertissement anti-désintermédiation (#dashboard-admin, module 9). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const userId = getRouterParam(event, 'userId')
  if (!userId) badRequest('Identifiant requis.')

  await sendAdminMessage(
    userId,
    'Avertissement WorkTogo',
    "Nous avons détecté des tentatives d'échange de coordonnées en dehors de la plateforme. Toute prestation doit être conclue et payée via WorkTogo, sous peine de restriction ou de suspension du compte.",
  )
  await recordAuditLog({ actor: admin, action: 'anti_circumvention.warn', targetType: 'user', targetId: userId })
  return { ok: true }
})
