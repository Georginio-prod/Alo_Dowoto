interface FirstContactBody {
  description?: string
  contact?: string
  urgency?: string
}

/**
 * Formulaire obligatoire de première prise de contact (#129), affiché côté
 * client une seule fois par conversation avant que le fil de discussion ne
 * s'ouvre. Composé en un premier message (le modèle Message ne porte que
 * `body`) et marqué via `firstContactDone` pour ne plus jamais redemander
 * ce formulaire sur cette même conversation.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
  }
  if (conversation.firstContactDone) {
    conflict('La prise de contact a déjà été effectuée pour cette conversation.')
  }

  const body = await readBody<FirstContactBody>(event)
  const description = body?.description?.trim()
  const contact = body?.contact?.trim()
  const urgency = body?.urgency?.trim()

  if (!description) {
    badRequest('Décrivez votre besoin pour envoyer votre demande.')
  }
  if (!contact) {
    badRequest('Vos coordonnées sont requises pour envoyer votre demande.')
  }

  // Paiement en séquestre obligatoire avant transmission au prestataire
  // (#194, epic #191) : cette itération ne gère que le tarif fixe affiché
  // (pas de devis à valider, choix produit encore à trancher). Sans tarif
  // configuré, la demande ne peut pas être engagée.
  const amount = resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict('Ce prestataire n\'a pas encore configuré de tarif fixe : demande impossible pour le moment.')
  }

  const messageLines = [description, `Contact : ${contact}`]
  if (urgency) messageLines.push(`Urgence / délai souhaité : ${urgency}`)

  const message = addMessage(conversation.id, user.id, user.role, messageLines.join('\n\n'))
  markFirstContactDone(conversation.id)
  const order = createEscrowOrder({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount })

  setResponseStatus(event, 201)
  return { conversation: await toConversationSummary(conversation, user.id), message, order }
})
