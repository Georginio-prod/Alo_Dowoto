import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { adminCancelSubscription } from '~~/server/utils/subscriptionStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Annule manuellement l'abonnement d'un prestataire (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')

  const subscription = await adminCancelSubscription(id)
  if (!subscription) notFound('Aucun abonnement pour ce prestataire.')
  await recordAuditLog({ actor: admin, action: 'subscription.cancel', targetType: 'user', targetId: id })
  return { subscription }
})
