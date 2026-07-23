import { findPlan } from '~~/app/data/plans'

interface WebhookBody {
  paymentId?: string
  status?: 'success' | 'failed'
  operatorRef?: string
  /** Horodatage (ms epoch) et nonce anti-rejeu (#355), couverts par la signature HMAC. */
  timestamp?: number
  nonce?: string
}

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event)) ?? ''
  const signature = getHeader(event, 'x-webhook-signature')

  if (!isValidWebhookSignature(rawBody, signature)) {
    unauthorized('Signature invalide.')
  }

  let body: WebhookBody
  try {
    // Corps signé mais potentiellement malformé : un parse nu lèverait une 500
    // non maîtrisée. On répond une 400 explicite à la place.
    body = JSON.parse(rawBody || '{}') as WebhookBody
  } catch {
    badRequest('Corps webhook illisible (JSON invalide).')
  }
  if (!body.paymentId || (body.status !== 'success' && body.status !== 'failed')) {
    badRequest('Requête webhook invalide.')
  }
  if (typeof body.timestamp !== 'number' || typeof body.nonce !== 'string' || !body.nonce) {
    badRequest('Requête webhook invalide.')
  }

  const payment = await getPayment(body.paymentId)
  if (!payment) {
    notFound('Paiement introuvable.')
  }

  // Idempotent : un paiement déjà résolu renvoie son état actuel sans être
  // retraité (double envoi possible côté opérateur) — avant toute
  // vérification anti-rejeu, qui ne protège que la fenêtre `pending` (#355).
  if (payment.status !== 'pending') {
    return { payment }
  }

  // Anti-rejeu (#355) : un webhook trop ancien, ou dont le nonce a déjà servi
  // pendant que ce paiement était `pending`, est refusé.
  if (!isWebhookTimestampFresh(body.timestamp) || consumeWebhookNonce(body.nonce)) {
    unauthorized('Signature invalide.')
  }

  const resolved = await resolvePayment(payment.id, body.status === 'success' ? 'confirmed' : 'failed', body.operatorRef)

  if (resolved?.status === 'confirmed') {
    const subscription = await getSubscriptionById(resolved.subscriptionId)
    const plan = subscription ? findPlan(subscription.plan) : undefined
    if (subscription && plan) {
      await activateSubscription(subscription.id, plan.durationDays)
    }
  }

  return { payment: resolved }
})
