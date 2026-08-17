import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { subscriptionExtendSchema } from '~~/server/utils/apiValidationAdmin'
import { adminExtendSubscription } from '~~/server/utils/subscriptionStore'
import { recordAuditLog } from '~~/server/utils/auditLog'

/** Prolonge manuellement l'abonnement d'un prestataire (#dashboard-admin, module 2). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, subscriptionExtendSchema)

  const subscription = await adminExtendSubscription(id, body.durationDays)
  if (!subscription) notFound('Aucun abonnement pour ce prestataire.')
  await recordAuditLog({ actor: admin, action: 'subscription.extend', targetType: 'user', targetId: id, metadata: { durationDays: body.durationDays } })
  return { subscription }
})
