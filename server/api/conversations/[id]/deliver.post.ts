/**
 * Le prestataire marque la prestation comme terminée (#195, epic #191).
 * Démarre le délai de validation tacite de 72h côté chercheur (voir
 * server/utils/escrowOrderStore.ts).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const result = await markEscrowOrderDelivered(conversation.id)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande à livrer pour cette conversation.')
    if (result.error === 'check_in_out_required') {
      conflict('Un check-in et un check-out sont requis avant de marquer la prestation comme terminée.')
    }
    conflict('Cette commande ne peut pas être marquée comme terminée dans son état actuel.')
  }

  return { order: result.order }
})
