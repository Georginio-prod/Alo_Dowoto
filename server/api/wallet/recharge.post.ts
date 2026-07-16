interface RechargeBody {
  provider?: string
  phone?: string
  amount?: number
}

const SIMULATED_CONFIRMATION_DELAY_MS = 3000
const MIN_RECHARGE_AMOUNT = 500

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const body = await readBody<RechargeBody>(event)

  if (body?.provider !== 'flooz' && body?.provider !== 'tmoney') {
    badRequest('Opérateur invalide.')
  }

  const phone = normalizeContact('phone', body.phone ?? '')
  if (!phone) {
    badRequest('Entrez un numéro valide (8 chiffres).')
  }

  const amount = body.amount
  if (!amount || !Number.isInteger(amount) || amount < MIN_RECHARGE_AMOUNT) {
    badRequest(`Le montant minimum de recharge est de ${MIN_RECHARGE_AMOUNT} F CFA.`)
  }

  const recharge = createRecharge({ userId: user.id, provider: body.provider, phone, amount })

  // Pas d'accès aux API sandbox Flooz/T-Money togolaises pour ce lot (#193),
  // même limite que server/api/payments/initiate.post.ts (#34) : en
  // dev/preview, on simule la confirmation opérateur après un délai. En
  // production, seul le vrai webhook (POST /api/wallet/webhook) résout la
  // recharge.
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(() => {
      resolveRecharge(recharge.id, 'confirmed', `SIMULATED-${recharge.id.slice(0, 8)}`)
    }, SIMULATED_CONFIRMATION_DELAY_MS)
  }

  return { recharge }
})
