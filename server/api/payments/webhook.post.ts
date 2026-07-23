import { findPlan } from '~~/app/data/plans'

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
  const result = paymentWebhookSchema.safeParse(parsed)
  if (!result.success) {
    badRequest(result.error.issues[0]?.message ?? 'Requête webhook invalide.')
  }
  const body = result.data

  const payment = await getPayment(body.paymentId)
  if (!payment) {
    notFound('Paiement introuvable.')
  }

  // Idempotent : un paiement déjà résolu renvoie son état actuel sans être
  // retraité (double envoi possible côté opérateur).
  if (payment.status !== 'pending') {
    return { payment }
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
