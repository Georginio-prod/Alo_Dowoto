import type { RecurringFrequency } from '~~/server/utils/recurringServiceStore'

interface CreateRecurringServiceBody {
  frequency?: RecurringFrequency
}

const VALID_FREQUENCIES: RecurringFrequency[] = ['hebdomadaire', 'mensuelle']

/**
 * Le chercheur met en place un service récurrent auprès du prestataire de
 * cette conversation (#271) : la fréquence choisie déclenche un prélèvement
 * automatique périodique (voir server/utils/recurringServiceStore.ts),
 * réutilisant le tarif fixe déjà utilisé pour la première prise de contact.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.clientId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readBody<CreateRecurringServiceBody>(event)
  if (!body?.frequency || !VALID_FREQUENCIES.includes(body.frequency)) {
    badRequest('Fréquence invalide (hebdomadaire ou mensuelle).')
  }

  const amount = resolveProviderRate(conversation.providerId)
  if (amount === null) {
    conflict('Ce prestataire n\'a pas encore configuré de tarif fixe : service récurrent impossible pour le moment.')
  }

  const result = createRecurringService({
    conversationId: conversation.id,
    clientId: user.id,
    providerId: conversation.providerId,
    amount,
    frequency: body.frequency,
  })

  if (!result.ok) {
    conflict('Un service récurrent est déjà actif pour cette conversation.')
  }

  setResponseStatus(event, 201)
  return { recurringService: result.service }
})
