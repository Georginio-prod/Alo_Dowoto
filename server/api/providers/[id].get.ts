/**
 * Fiche détaillée d'un prestataire (#127, fenêtre « Voir le profil »).
 * Route publique (comme la recherche, #43) : les coordonnées ne sont
 * démasquées que si l'utilisateur connecté est le client qui a déjà validé
 * intégralement une prestation avec ce prestataire (commande `released`,
 * #264 anti-fuite) — pas dès la simple prise de contact.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    badRequest('Identifiant prestataire manquant.')
  }

  const viewer = await getSessionUser(getCookie(event, SESSION_COOKIE))
  const contactRevealed = !!viewer && viewer.role === 'client' && await hasReleasedOrderBetween(viewer.id, id)

  const provider = await getProviderDetail(id, contactRevealed)
  if (!provider) {
    notFound('Prestataire introuvable.')
  }

  return { provider }
})
