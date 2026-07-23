/**
 * Le chercheur annule son service récurrent (#271) : plus aucun prélèvement
 * automatique ne sera déclenché pour cette conversation. N'affecte pas la
 * commande escrow du cycle en cours, le cas échéant (validation/litige
 * suivent leur cours normal).
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const result = cancelRecurringService(conversation.id)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucun service récurrent pour cette conversation.')
    conflict('Ce service récurrent est déjà annulé.')
  }

  return { recurringService: result.service }
})
