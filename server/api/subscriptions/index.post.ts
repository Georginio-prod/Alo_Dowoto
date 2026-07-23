import { findPlan } from '~~/app/data/plans'

export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)

  const body = await readSchemaBody(event, planSlugSchema)
  const plan = findPlan(body.plan)
  if (!plan) {
    badRequest('Formule invalide.')
  }

  const subscription = await createPendingSubscription(user.id, plan.slug)
  return { subscription }
})
