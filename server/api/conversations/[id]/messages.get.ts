export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  // Ownership check regroupé (comme requests/[id]/matches.get.ts) : on ne
  // distingue pas "inexistante" de "pas la vôtre" pour ne pas révéler
  // l'existence d'une conversation à un tiers.
  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
  }

  // Paiement en séquestre obligatoire avant transmission au prestataire
  // (#194, epic #191) : tant que la commande n'est pas payée, le
  // prestataire ne voit ni le contenu des messages ni le détail de la
  // demande. Le chercheur, lui, voit toujours ses propres messages.
  const order = getEscrowOrderByConversationId(conversation.id)
  const isViewerProvider = user.id === conversation.providerId
  if (isViewerProvider && order && order.status === 'awaiting_payment') {
    return {
      conversation: await toConversationSummary(conversation, user.id),
      messages: [],
      escrowOrder: order,
      awaitingPayment: true,
    }
  }

  return {
    conversation: await toConversationSummary(conversation, user.id),
    messages: getMessages(conversation.id),
    escrowOrder: order,
    awaitingPayment: false,
  }
})
