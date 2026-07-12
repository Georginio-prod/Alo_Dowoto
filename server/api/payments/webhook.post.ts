import { findPlan } from '~~/app/data/plans'

interface WebhookBody {
  paymentId?: string
  status?: 'success' | 'failed'
  operatorRef?: string
}

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event)) ?? ''
  const signature = getHeader(event, 'x-webhook-signature')

  if (!isValidWebhookSignature(rawBody, signature)) {
    throw createError({ statusCode: 401, statusMessage: 'Signature invalide.' })
  }

  const body = JSON.parse(rawBody || '{}') as WebhookBody
  if (!body.paymentId || (body.status !== 'success' && body.status !== 'failed')) {
    throw createError({ statusCode: 400, statusMessage: 'Requête webhook invalide.' })
  }

  const payment = getPayment(body.paymentId)
  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: 'Paiement introuvable.' })
  }

  // Idempotent : un paiement déjà résolu renvoie son état actuel sans être
  // retraité (double envoi possible côté opérateur).
  if (payment.status !== 'pending') {
    return { payment }
  }

  const resolved = resolvePayment(payment.id, body.status === 'success' ? 'confirmed' : 'failed', body.operatorRef)

  if (resolved?.status === 'confirmed') {
    const subscription = getSubscriptionById(resolved.subscriptionId)
    const plan = subscription ? findPlan(subscription.plan) : undefined
    if (subscription && plan) {
      activateSubscription(subscription.id, plan.durationDays)
    }
  }

  return { payment: resolved }
})
