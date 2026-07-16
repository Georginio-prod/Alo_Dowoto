/**
 * Fiche détaillée d'un prestataire (#127, fenêtre « Voir le profil »).
 * Route publique (comme la recherche, #43) : les coordonnées ne sont
 * démasquées que si l'utilisateur connecté est le client qui a déjà engagé
 * le contact avec ce prestataire (conversation existante, #58/#59).
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    badRequest('Identifiant prestataire manquant.')
  }

  const viewer = await getSessionUser(getCookie(event, SESSION_COOKIE))
  const contactRevealed = !!viewer && viewer.role === 'client' && hasConversation(viewer.id, id)

  const provider = getProviderDetail(id, contactRevealed)
  if (!provider) {
    notFound('Prestataire introuvable.')
  }

  return { provider }
})
