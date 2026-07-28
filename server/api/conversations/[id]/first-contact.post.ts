import { getSectorFieldsFr } from '~~/app/data/firstContactSectorFields'

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
  const conversation = id ? await getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id)) {
    notFound('Conversation introuvable.')
  }
  if (conversation.firstContactDone) {
    conflict('La prise de contact a déjà été effectuée pour cette conversation.')
  }

  const { description, contact, urgency, sectorAnswers } = await readSchemaBody(event, firstContactSchema)

  // Anti-contournement (#265) : la description et le motif d'urgence sont du
  // texte libre, contrairement à `contact` qui a son propre traitement
  // (masquage, #264) — un numéro/e-mail/proposition hors plateforme glissé
  // ici est bloqué et journalisé de la même façon que dans la messagerie.
  const descriptionReason = detectContournementAttempt(description)
  if (descriptionReason) {
    await logContournementAttempt({ conversationId: conversation.id, userId: user.id, reason: descriptionReason, text: description })
    badRequest('Votre description semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.')
  }
  const urgencyReason = urgency ? detectContournementAttempt(urgency) : null
  if (urgencyReason) {
    await logContournementAttempt({ conversationId: conversation.id, userId: user.id, reason: urgencyReason, text: urgency })
    badRequest('Le champ « urgence / délai souhaité » semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.')
  }

  // Fiche différenciée par secteur (#295) : les champs additionnels affichés
  // côté client (ex. adresse de départ/arrivée pour un transporteur,
  // fréquence pour du ménage) dépendent du secteur du prestataire — voir
  // app/data/firstContactSectorFields.ts. Revalidés ici car le client ne
  // fait pas foi (requis, anti-contournement sur les champs texte).
  const providerSector = getProviderById(conversation.providerId)?.sector ?? null
  const sectorFields = getSectorFieldsFr(providerSector)
  const sectorAnswerLines: string[] = []
  for (const field of sectorFields) {
    const value = sectorAnswers[field.key]?.trim()
    if (!value) {
      if (field.required) badRequest(`Le champ « ${field.label} » est requis pour ce type de prestation.`)
      continue
    }
    if (field.type === 'text') {
      const reason = detectContournementAttempt(value)
      if (reason) {
        await logContournementAttempt({ conversationId: conversation.id, userId: user.id, reason, text: value })
        badRequest(`Le champ « ${field.label} » semble contenir un numéro, un e-mail ou une proposition hors plateforme, ce qui est interdit par les CGU.`)
      }
    }
    const label = field.type === 'select' ? (field.options?.find((option) => option.value === value)?.label ?? value) : value
    sectorAnswerLines.push(`${field.label} : ${label}`)
  }

  // Limite de demandes non payées simultanées (#280) : en plus du quota
  // mensuel de contacts (server/utils/quotaStore.ts), empêche un chercheur
  // d'ouvrir plusieurs demandes « pour voir » à la fois sans jamais en payer
  // aucune — chaque demande non payée occupe inutilement l'attention d'un
  // prestataire tant qu'elle reste ouverte.
  if (await countUnpaidOrdersForClient(user.id) >= MAX_SIMULTANEOUS_UNPAID_ORDERS) {
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

  // Règles anti-fraude de base (#277) : plafond dur sur le montant, seuil de
  // revue manuelle, détection d'un rythme de création de commandes anormal —
  // voir server/utils/fraudDetection.ts.
  const risk = evaluateOrderRisk({
    clientId: user.id,
    providerId: conversation.providerId,
    amount,
    recentOrderTimestamps: await getRecentOrderTimestampsForClient(user.id),
  })
  if (risk.blocked) {
    conflict(risk.reason)
  }

  // Le contact réel n'est jamais inséré en clair dans le message (#264,
  // anti-fuite) : seule une version masquée apparaît dans le fil tant que la
  // prestation n'est pas validée ; la valeur brute est conservée à part et
  // révélée automatiquement au prestataire à la libération des fonds (voir
  // `escrowOrderStore.ts`, `releaseOrderFunds`).
  const messageLines = [description, ...sectorAnswerLines, `Contact : ${maskContact(contact)}`]
  if (urgency) messageLines.push(`Urgence / délai souhaité : ${urgency}`)

  const message = await addMessage(conversation.id, user.id, user.role, messageLines.join('\n\n'))
  await markFirstContactDone(conversation.id)
  await setClientContact(conversation.id, contact)
  const order = await createEscrowOrder({ conversationId: conversation.id, clientId: user.id, providerId: conversation.providerId, amount })

  setResponseStatus(event, 201)
  return { conversation: await toConversationSummary(conversation, user.id), message, order }
})
