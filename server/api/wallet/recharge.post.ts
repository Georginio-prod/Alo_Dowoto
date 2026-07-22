const SIMULATED_CONFIRMATION_DELAY_MS = 3000

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const body = await readSchemaBody(event, walletRechargeSchema)

  const phone = normalizeContact('phone', body.phone)
  if (!phone) {
    badRequest('Entrez un numéro valide (8 chiffres).')
  }

  const recharge = await createRecharge({ userId: user.id, provider: body.provider, phone, amount: body.amount })

  // Pas d'accès aux API sandbox Flooz/T-Money togolaises pour ce lot (#193),
  // même limite que server/api/payments/initiate.post.ts (#34) : en
  // dev/preview, on simule la confirmation opérateur après un délai. En
  // production, seul le vrai webhook (POST /api/wallet/webhook) résout la
  // recharge.
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(() => {
      // Confirmation simulée en tâche de fond (base de données) : erreurs
      // capturées pour éviter tout rejet de promesse non géré.
      void resolveRecharge(recharge.id, 'confirmed', `SIMULATED-${recharge.id.slice(0, 8)}`).catch(() => {})
    }, SIMULATED_CONFIRMATION_DELAY_MS)
  }

  return { recharge }
})
