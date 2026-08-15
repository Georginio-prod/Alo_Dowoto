import { adminArbitrateDispute } from '~~/server/utils/escrowDisputeResolution'

/**
 * Action admin : tranche un litige (statut `disputed`) depuis le dashboard.
 * `outcome: 'provider'` libère les fonds au prestataire ; `outcome: 'client'`
 * rembourse le chercheur et pénalise le prestataire. Réutilise les primitives
 * atomiques de résolution de litige (#366).
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const conversationId = getRouterParam(event, 'conversationId')
  if (!conversationId) badRequest('Identifiant de commande manquant.')

  const body = await readBody<{ outcome?: unknown }>(event)
  const outcome = body?.outcome
  if (outcome !== 'provider' && outcome !== 'client') {
    badRequest("Le verdict doit être 'provider' (verser au prestataire) ou 'client' (rembourser le chercheur).")
  }

  const result = await adminArbitrateDispute(conversationId, outcome)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Commande introuvable.')
    conflict('Seul un litige ouvert (statut « en litige ») peut être arbitré.')
  }

  return { ok: true, order: result.order }
})
