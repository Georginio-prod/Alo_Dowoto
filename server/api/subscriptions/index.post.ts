import { findPlan } from '~~/app/data/plans'

interface CreateSubscriptionBody {
  plan?: string
}

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  if (user.role !== 'prestataire') {
    throw createError({ statusCode: 403, statusMessage: 'Réservé aux comptes prestataire.' })
  }

  const body = await readBody<CreateSubscriptionBody>(event)
  const plan = findPlan(body?.plan ?? '')
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Formule invalide.' })
  }

  const subscription = createPendingSubscription(user.id, plan.slug)
  return { subscription }
})
