import { findPlan } from '~~/app/data/plans'

const SIMULATED_CONFIRMATION_DELAY_MS = 3000

export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)

  const body = await readSchemaBody(event, initiatePaymentSchema)

  const phone = normalizeContact('phone', body.phone)
  if (!phone) {
    badRequest('Entrez un numéro valide (8 chiffres).')
  }

  const subscription = body.subscriptionId ? await getSubscriptionById(body.subscriptionId) : null
  if (!subscription || subscription.userId !== user.id) {
    notFound('Abonnement introuvable.')
  }
  if (subscription.status !== 'en_attente') {
    conflict('Cet abonnement ne peut pas être payé (déjà actif).')
  }

  const plan = findPlan(subscription.plan)
  if (!plan) {
    badRequest('Formule invalide.')
  }

  const payment = await createPayment({
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
      // Confirmation simulée : chaîne asynchrone (base de données) exécutée
      // en tâche de fond. On capture les erreurs éventuelles pour ne pas
      // laisser de rejet de promesse non géré (aucun `await` possible ici).
      void (async () => {
        const resolved = await resolvePayment(payment.id, 'confirmed', `SIMULATED-${payment.id.slice(0, 8)}`)
        if (resolved?.status === 'confirmed') {
          await activateSubscription(resolved.subscriptionId, plan.durationDays)
        }
      })().catch(() => {})
    }, SIMULATED_CONFIRMATION_DELAY_MS)
  }

  return { payment }
})
