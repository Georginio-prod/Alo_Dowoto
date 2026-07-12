import { findPlan } from '~~/app/data/plans'

interface InitiatePaymentBody {
  subscriptionId?: string
  provider?: string
  phone?: string
}

const SIMULATED_CONFIRMATION_DELAY_MS = 3000

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  if (user.role !== 'prestataire') {
    throw createError({ statusCode: 403, statusMessage: 'Réservé aux comptes prestataire.' })
  }

  const body = await readBody<InitiatePaymentBody>(event)

  if (body?.provider !== 'flooz' && body?.provider !== 'tmoney') {
    throw createError({ statusCode: 400, statusMessage: 'Opérateur invalide.' })
  }

  const phone = normalizeContact('phone', body.phone ?? '')
  if (!phone) {
    throw createError({ statusCode: 400, statusMessage: 'Entrez un numéro valide (8 chiffres).' })
  }

  const subscription = body.subscriptionId ? getSubscriptionById(body.subscriptionId) : null
  if (!subscription || subscription.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Abonnement introuvable.' })
  }
  if (subscription.status !== 'en_attente') {
    throw createError({ statusCode: 409, statusMessage: 'Cet abonnement ne peut pas être payé (déjà actif).' })
  }

  const plan = findPlan(subscription.plan)
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Formule invalide.' })
  }

  const payment = createPayment({
    userId: user.id,
    subscriptionId: subscription.id,
    provider: body.provider,
    phone,
    amount: plan.price,
  })

  // Pas d'accès aux API sandbox Flooz/T-Money togolaises pour ce lot (#34) :
  // en dev/preview, on simule la confirmation opérateur après un délai
  // (voir #33 — « webhook réel en prod, délai simulé en dev »). En
  // production, seul le vrai webhook (POST /api/payments/webhook) résout
  // le paiement.
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(() => {
      resolvePayment(payment.id, 'confirmed', `SIMULATED-${payment.id.slice(0, 8)}`)
      const resolved = getPayment(payment.id)
      if (resolved?.status === 'confirmed') {
        activateSubscription(resolved.subscriptionId, plan.durationDays)
      }
    }, SIMULATED_CONFIRMATION_DELAY_MS)
  }

  return { payment }
})
