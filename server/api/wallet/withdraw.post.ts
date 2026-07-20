import { MIN_WITHDRAWAL_AMOUNT } from '~~/server/utils/walletStore'

/** Demande de retrait prestataire vers son moyen de paiement configuré (« Solde », dashboard prestataire). */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const body = await readSchemaBody(event, walletWithdrawSchema)

  const profile = getProviderProfile(user.id)
  if (!profile?.payoutMethod) {
    badRequest('Choisissez un moyen de retrait avant de faire une demande.')
  }

  const result = requestWithdrawal(user.id, body.amount)
  if (!result.ok) {
    if (result.error === 'below_minimum') {
      badRequest(`Le retrait minimum est de ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('fr-FR')} F CFA.`)
    }
    paymentRequired('Solde insuffisant pour ce retrait.')
  }

  return { movement: result.movement }
})
