export default defineEventHandler((event) => {
  const user = requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const payment = id ? getPayment(id) : null

  if (!payment || payment.userId !== user.id) {
    notFound('Paiement introuvable.')
  }

  return { payment }
})
