interface WalletWebhookBody {
  rechargeId?: string
  status?: 'success' | 'failed'
  operatorRef?: string
}

/**
 * Webhook opérateur (Flooz/T-Money) confirmant une recharge de portefeuille
 * (#193), même mécanique que server/api/payments/webhook.post.ts (#34).
 */
export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event)) ?? ''
  const signature = getHeader(event, 'x-webhook-signature')

  if (!isValidWebhookSignature(rawBody, signature)) {
    unauthorized('Signature invalide.')
  }

  let body: WalletWebhookBody
  try {
    // Corps signé mais potentiellement malformé : un parse nu lèverait une 500
    // non maîtrisée. On répond une 400 explicite à la place.
    body = JSON.parse(rawBody || '{}') as WalletWebhookBody
  } catch {
    badRequest('Corps webhook illisible (JSON invalide).')
  }
  if (!body.rechargeId || (body.status !== 'success' && body.status !== 'failed')) {
    badRequest('Requête webhook invalide.')
  }

  const recharge = getRecharge(body.rechargeId)
  if (!recharge) {
    notFound('Recharge introuvable.')
  }

  // Idempotent : une recharge déjà résolue renvoie son état actuel sans être
  // retraitée (double envoi possible côté opérateur).
  if (recharge.status !== 'pending') {
    return { recharge }
  }

  const resolved = resolveRecharge(recharge.id, body.status === 'success' ? 'confirmed' : 'failed', body.operatorRef)

  return { recharge: resolved }
})
