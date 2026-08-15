import { cancelEscrowOrder } from '~~/server/utils/escrowOrderStore'

/**
 * Action admin : rembourse une commande en séquestre (statut `in_escrow` ou
 * `delivered`) au chercheur, sans pénalité pour le prestataire. Réutilise
 * `cancelEscrowOrder` (remboursement + passage `refunded` atomiques et
 * idempotents, #366). Pour un litige ouvert, utiliser plutôt l'arbitrage.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const conversationId = getRouterParam(event, 'conversationId')
  if (!conversationId) badRequest('Identifiant de commande manquant.')

  const body = await readBody<{ reason?: unknown }>(event)
  const reason = typeof body?.reason === 'string' && body.reason.trim()
    ? body.reason.trim()
    : 'Remboursement décidé par un administrateur.'

  const result = await cancelEscrowOrder(conversationId, reason)
  if (!result.ok) {
    if (result.error === 'not_found') notFound('Commande introuvable.')
    if (result.error === 'invalid_status') {
      conflict('Seule une commande sous séquestre (non encore versée ni remboursée) peut être remboursée ici.')
    }
    badRequest('Motif de remboursement requis.')
  }

  return { ok: true, order: result.order }
})
