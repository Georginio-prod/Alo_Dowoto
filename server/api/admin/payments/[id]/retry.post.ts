import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { readSchemaBody } from '~~/server/utils/apiValidation'
import { z } from 'zod'
import { adminRetryTransaction } from '~~/server/utils/adminPaymentActions'
import { recordAuditLog } from '~~/server/utils/auditLog'

const retrySchema = z.object({ kind: z.enum(['subscription_payment', 'wallet_recharge'], { error: 'Type invalide.' }) })

/** Rejoue une transaction échouée (abonnement ou recharge) (#dashboard-admin, module 5). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminRole(event)
  const id = getRouterParam(event, 'id')
  if (!id) badRequest('Identifiant requis.')
  const body = await readSchemaBody(event, retrySchema)

  const result = await adminRetryTransaction(body.kind, id)
  if (!result.ok) badRequest(result.error === 'not_found' ? 'Transaction introuvable.' : 'Seule une transaction échouée peut être rejouée.')
  await recordAuditLog({ actor: admin, action: 'payment.retry', targetType: body.kind, targetId: id })
  return { ok: true }
})
