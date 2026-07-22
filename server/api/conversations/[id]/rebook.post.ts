interface RebookBody {
  description?: string
}

/**
 * Reprend un prestataire déjà utilisé (#266, rebooking rapide) : crée une
 * nouvelle commande en séquestre sur une conversation dont la précédente
 * commande est terminale (`released`/`refunded`, voir `createEscrowOrder`).
 * Le contact du chercheur et le tarif du prestataire sont déjà connus —
 * seule une description de la nouvelle demande est requise, contrairement
 * au premier contact (`first-contact.post.ts`) qui redemande tout.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const existingOrder = await getEscrowOrderByConversationId(conversation.id)
  if (!existingOrder || (existingOrder.status !== 'released' && existingOrder.status !== 'refunded')) {
    conflict('Une reprise n\'est possible qu\'après une prestation terminée ou annulée avec ce prestataire.')
  }

  const body = await readBody<RebookBody>(event)
  const description = body?.description?.trim()
  if (!description) {
    badRequest('Décrivez votre nouvelle demande pour relancer ce prestataire.')
  }

  const amount = resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict('Ce prestataire n\'a pas encore configuré de tarif fixe : demande impossible pour le moment.')
  }

  const message = addMessage(conversation.id, user.id, user.role, `Nouvelle demande (reprise) : ${description}`)
  const order = await createEscrowOrder({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount })

  setResponseStatus(event, 201)
  return { message, order }
})
