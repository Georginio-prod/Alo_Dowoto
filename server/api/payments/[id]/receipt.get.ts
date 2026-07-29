/**
 * Reçu PDF d'un paiement d'abonnement confirmé (#363). Accessible uniquement
 * au titulaire du paiement ; aucun reçu pour un paiement non confirmé (rien
 * à justifier tant que l'opérateur mobile money n'a pas validé la transaction).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const payment = id ? await getPayment(id) : null

  if (!payment || payment.userId !== user.id) {
    notFound('Paiement introuvable.')
  }
  if (payment.status !== 'confirmed') {
    badRequest('Aucun reçu disponible pour un paiement non confirmé.')
  }

  const subscription = await getSubscriptionById(payment.subscriptionId)
  if (!subscription) {
    notFound('Abonnement introuvable.')
  }

  const locale = receiptLocaleFromQuery(getQuery(event).locale)
  const pdf = await generatePaymentReceiptPdf(payment, user, subscription.plan, locale)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="recu-abonnement-${payment.id.slice(0, 8)}.pdf"`)
  return pdf
})
