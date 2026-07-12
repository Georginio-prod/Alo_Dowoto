export default defineEventHandler((event) => {
  const user = requireSessionUser(event)
  if (user.role !== 'prestataire') {
    throw createError({ statusCode: 403, statusMessage: 'Réservé aux comptes prestataire.' })
  }

  return { subscription: getSubscriptionByUserId(user.id) }
})
