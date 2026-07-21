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

  // Anti-contournement (#265) : la description et le motif d'urgence sont du
  // texte libre, contrairement à `contact` qui a son propre traitement
  // (masquage, #264) — un numéro/e-mail/proposition hors plateforme glissé
  // ici est bloqué et journalisé de la même façon que dans la messagerie.
  const descriptionReason = detectContournementAttempt(description)
  if (descriptionReason) {
    logContournementAttempt({ conversationId: conversation.id, userId: user.id, reason: descriptionReason, text: description })
    badRequest('Votre description semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.')
  }
  const urgencyReason = urgency ? detectContournementAttempt(urgency) : null
  if (urgencyReason) {
    logContournementAttempt({ conversationId: conversation.id, userId: user.id, reason: urgencyReason, text: urgency as string })
    badRequest('Le champ « urgence / délai souhaité » semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.')
  }

  // Limite de demandes non payées simultanées (#280) : en plus du quota
  // mensuel de contacts (server/utils/quotaStore.ts), empêche un chercheur
  // d'ouvrir plusieurs demandes « pour voir » à la fois sans jamais en payer
  // aucune — chaque demande non payée occupe inutilement l'attention d'un
  // prestataire tant qu'elle reste ouverte.
  if (countUnpaidOrdersForClient(user.id) >= MAX_SIMULTANEOUS_UNPAID_ORDERS) {
    conflict(`Vous avez déjà ${MAX_SIMULTANEOUS_UNPAID_ORDERS} demande(s) en attente de paiement. Réglez-les ou annulez-les avant d'en envoyer une nouvelle.`)
  }

  // Paiement en séquestre obligatoire avant transmission au prestataire
  // (#194, epic #191) : cette itération ne gère que le tarif fixe affiché
  // (pas de devis à valider, choix produit encore à trancher). Sans tarif
  // configuré, la demande ne peut pas être engagée.
  const amount = resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict('Ce prestataire n\'a pas encore configuré de tarif fixe : demande impossible pour le moment.')
  }

  // Le contact réel n'est jamais inséré en clair dans le message (#264,
  // anti-fuite) : seule une version masquée apparaît dans le fil tant que la
  // prestation n'est pas validée ; la valeur brute est conservée à part et
  // révélée automatiquement au prestataire à la libération des fonds (voir
  // `escrowOrderStore.ts`, `releaseOrderFunds`).
  const messageLines = [description, `Contact : ${maskContact(contact)}`]
  if (urgency) messageLines.push(`Urgence / délai souhaité : ${urgency}`)

  const message = addMessage(conversation.id, user.id, user.role, messageLines.join('\n\n'))
  markFirstContactDone(conversation.id)
  setClientContact(conversation.id, contact)
  const order = createEscrowOrder({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount })

  setResponseStatus(event, 201)
  return { conversation: await toConversationSummary(conversation, user.id), message, order }
})
