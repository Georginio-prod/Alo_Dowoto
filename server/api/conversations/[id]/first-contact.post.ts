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
  const user = requireClientRole(event)
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

  const messageLines = [description, `Contact : ${contact}`]
  if (urgency) messageLines.push(`Urgence / délai souhaité : ${urgency}`)

  const message = addMessage(conversation.id, user.id, user.role, messageLines.join('\n\n'))
  markFirstContactDone(conversation.id)

  setResponseStatus(event, 201)
  return { conversation: toConversationSummary(conversation, user.id), message }
})
