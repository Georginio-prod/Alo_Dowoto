/**
 * Reçu PDF d'un mouvement de portefeuille (#363) — réservé aux débits et
 * libérations de séquestre, seuls mouvements que l'issue demande de pouvoir
 * justifier par un document téléchargeable. Accessible uniquement au
 * titulaire du mouvement (`walletUserId`).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const movement = id ? await getMovementById(id) : null

  if (!movement || movement.walletUserId !== user.id) {
    notFound('Mouvement introuvable.')
  }
  if (movement.type !== 'escrow_debit' && movement.type !== 'escrow_release') {
    badRequest('Aucun reçu disponible pour ce type de mouvement.')
  }

  const counterparty = movement.counterpartyUserId ? await getUserById(movement.counterpartyUserId) : null
  const locale = receiptLocaleFromQuery(getQuery(event).locale)
  const pdf = await generateMovementReceiptPdf(movement, user, counterparty, locale)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="recu-${movement.id.slice(0, 8)}.pdf"`)
  return pdf
})
