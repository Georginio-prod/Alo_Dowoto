import { badRequest, conflict, notFound, unauthorized } from '../utils/apiError'
import { parseSchema } from '../validation/validate'
import { paymentWebhookSchema } from '../validation/schemas/payments'
import { getPlanConfig } from '../data/plans'
import { isValidWebhookSignature, isWebhookTimestampFresh } from '../utils/webhookSignature'
import { paymentRepository, type Payment, type PaymentProvider, type PaymentRepository } from '../repositories/paymentRepository'
import { webhookNonceRepository, type WebhookNonceRepository } from '../repositories/webhookNonceRepository'
import { subscriptionService } from './subscriptionService'
import { referralService } from './referralService'

/**
 * Paiement d'abonnement Mobile Money (#34). Orchestration **portée iso** depuis
 * `server/api/payments/**` + `paymentStore` (ADR-0016) : initiation (avec
 * confirmation opérateur simulée hors prod), webhook (signature HMAC + anti-rejeu
 * #355) qui **active l'abonnement** et **récompense le parrainage** à la
 * confirmation. La simulation dev n'active QUE l'abonnement (pas le parrainage),
 * exactement comme le handler Nitro.
 */
const SIMULATED_CONFIRMATION_DELAY_MS = 3000

export interface InitiatePaymentInput {
  provider: PaymentProvider
  phone: string
  subscriptionId?: string
}

export function createPaymentService(
  payments: PaymentRepository = paymentRepository,
  nonces: WebhookNonceRepository = webhookNonceRepository,
) {
  async function resolvePayment(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Promise<Payment | null> {
    const existing = await payments.findById(id)
    if (!existing) return null
    if (existing.status !== 'pending') return existing
    const count = await payments.markResolved(id, status, operatorRef)
    if (count === 0) return payments.findById(id)
    return payments.findById(id)
  }

  return {
    async getPayment(id: string): Promise<Payment | null> {
      return payments.findById(id)
    },

    async listConfirmedByUser(userId: string): Promise<Payment[]> {
      return payments.listConfirmedByUser(userId)
    },

    /** Initie un paiement pour un abonnement en attente du prestataire connecté. */
    async initiatePayment(userId: string, input: InitiatePaymentInput): Promise<Payment> {
      const subscription = input.subscriptionId ? await subscriptionService.getSubscriptionById(input.subscriptionId) : null
      if (!subscription || subscription.userId !== userId) notFound('Abonnement introuvable.')
      if (subscription.status !== 'en_attente') conflict('Cet abonnement ne peut pas être payé (déjà actif).')

      const plan = getPlanConfig(subscription.plan)
      if (!plan) badRequest('Formule invalide.')

      const payment = await payments.create({
        userId,
        subscriptionId: subscription.id,
        provider: input.provider,
        phone: input.phone,
        amount: plan.price,
      })

      // Hors prod : confirmation opérateur simulée (#33/#34) — active
      // l'abonnement, sans récompense de parrainage (iso handler Nitro).
      // `.unref()` : ne retient pas le process (tests courts).
      if (process.env.NODE_ENV !== 'production') {
        setTimeout(() => {
          void (async () => {
            const resolved = await resolvePayment(payment.id, 'confirmed', `SIMULATED-${payment.id.slice(0, 8)}`)
            if (resolved?.status === 'confirmed') await subscriptionService.activateSubscription(resolved.subscriptionId, plan.durationDays)
          })().catch(() => {})
        }, SIMULATED_CONFIRMATION_DELAY_MS).unref?.()
      }

      return payment
    },

    /** Traite un webhook opérateur : signature → parse → anti-rejeu → résolution. */
    async processWebhook(rawBody: string, signature: string | undefined): Promise<Payment> {
      if (!isValidWebhookSignature(rawBody, signature)) unauthorized('Signature invalide.')

      let parsed: unknown
      try {
        parsed = JSON.parse(rawBody || '{}')
      } catch {
        badRequest('Corps webhook illisible (JSON invalide).')
      }
      const body = parseSchema(paymentWebhookSchema, parsed)

      const payment = await payments.findById(body.paymentId)
      if (!payment) notFound('Paiement introuvable.')
      if (payment.status !== 'pending') return payment

      if (!isWebhookTimestampFresh(body.timestamp) || (await nonces.consume(body.nonce))) {
        unauthorized('Signature invalide.')
      }

      const resolved = await resolvePayment(payment.id, body.status === 'success' ? 'confirmed' : 'failed', body.operatorRef)

      if (resolved?.status === 'confirmed') {
        const subscription = await subscriptionService.getSubscriptionById(resolved.subscriptionId)
        const plan = subscription ? getPlanConfig(subscription.plan) : undefined
        if (subscription && plan) await subscriptionService.activateSubscription(subscription.id, plan.durationDays)
        // Premier paiement réel du filleul (#365) — idempotent, sans effet sinon.
        await referralService.rewardReferralIfPending(resolved.userId)
      }

      return resolved ?? payment
    },
  }
}

/** Instance par défaut, liée aux repositories/services partagés. */
export const paymentService = createPaymentService()
