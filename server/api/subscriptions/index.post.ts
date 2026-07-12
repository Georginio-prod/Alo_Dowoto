import { findPlan } from '~~/app/data/plans'

interface CreateSubscriptionBody {
  plan?: string
}

export default defineEventHandler(async (event) => {
  const user = requireProviderRole(event)

  const body = await readBody<CreateSubscriptionBody>(event)
  const plan = findPlan(body?.plan ?? '')
  if (!plan) {
    badRequest('Formule invalide.')
  }

  const subscription = createPendingSubscription(user.id, plan.slug)
  return { subscription }
})
