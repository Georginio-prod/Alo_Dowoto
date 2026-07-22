export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const payment = id ? await getPayment(id) : null

  if (!payment || payment.userId !== user.id) {
    notFound('Paiement introuvable.')
  }

  return { payment }
})
