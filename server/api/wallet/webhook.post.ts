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

  let parsed: unknown
  try {
    // Corps signé mais potentiellement malformé : un parse nu lèverait une 500
    // non maîtrisée. On répond une 400 explicite à la place.
    parsed = JSON.parse(rawBody || '{}')
  } catch {
    badRequest('Corps webhook illisible (JSON invalide).')
  }
  const result = walletWebhookSchema.safeParse(parsed)
  if (!result.success) {
    badRequest(result.error.issues[0]?.message ?? 'Requête webhook invalide.')
  }
  const body = result.data

  const recharge = await getRecharge(body.rechargeId)
  if (!recharge) {
    notFound('Recharge introuvable.')
  }

  // Idempotent : une recharge déjà résolue renvoie son état actuel sans être
  // retraitée (double envoi possible côté opérateur) — avant toute
  // vérification anti-rejeu, qui ne protège que la fenêtre `pending` (#355).
  if (recharge.status !== 'pending') {
    return { recharge }
  }

  // Anti-rejeu (#355) : une recharge trop ancienne, ou dont le nonce a déjà
  // servi pendant que cette recharge était `pending`, est refusée.
  if (!isWebhookTimestampFresh(body.timestamp) || await consumeWebhookNonce(body.nonce)) {
    unauthorized('Signature invalide.')
  }

  const resolved = await resolveRecharge(recharge.id, body.status === 'success' ? 'confirmed' : 'failed', body.operatorRef)

  return { recharge: resolved }
})
