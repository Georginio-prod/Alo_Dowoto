interface CheckOutBody {
  lat?: number
  lng?: number
}

/**
 * Le prestataire enregistre son départ du lieu d'intervention (#268, preuve
 * d'intervention in-app anti-fuite). Requiert un check-in préalable sur la
 * même commande (voir check-in.post.ts) — c'est la combinaison des deux
 * horodatages qui débloque `deliver.post.ts` (marquer la prestation comme
 * terminée).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = getRouterParam(event, 'id')
  const conversation = id ? getConversationById(id) : null

  if (!conversation || !isConversationParticipant(conversation, user.id) || conversation.providerId !== user.id) {
    notFound('Conversation introuvable.')
  }

  const body = await readBody<CheckOutBody>(event).catch(() => undefined)
  const location = typeof body?.lat === 'number' && typeof body?.lng === 'number' ? { lat: body.lat, lng: body.lng } : null

  const result = recordEscrowOrderCheckOut(conversation.id, location)

  if (!result.ok) {
    if (result.error === 'not_found') notFound('Aucune commande en cours pour cette conversation.')
    if (result.error === 'check_in_required') badRequest('Un check-in doit être enregistré avant le check-out.')
    if (result.error === 'already_checked_out') conflict('Un check-out a déjà été enregistré pour cette prestation.')
    conflict('Le check-out n\'est possible que pour une commande payée et non encore livrée.')
  }

  return { order: result.order }
})
