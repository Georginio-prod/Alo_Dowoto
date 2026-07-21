import { findPlan } from '~~/app/data/plans'

interface StartTrialBody {
  plan?: string
}

/**
 * Démarre l'essai gratuit de 14 jours (#281), sans paiement préalable —
 * réservé à la toute première souscription d'un prestataire. Contrairement
 * à `POST /api/subscriptions` (abonnement en attente de paiement), la
 * formule est immédiatement active.
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)

  const body = await readBody<StartTrialBody>(event)
  const plan = findPlan(body?.plan ?? '')
  if (!plan) {
    badRequest('Formule invalide.')
  }

  const result = activateTrialSubscription(user.id, plan.slug)
  if (!result.ok) {
    conflict("L'essai gratuit n'est disponible qu'à la première souscription.")
  }

  setResponseStatus(event, 201)
  return { subscription: result.subscription }
})
