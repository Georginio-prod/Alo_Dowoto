/**
 * Supprime la position GPS enregistrée du compte connecté (#geoloc, partie 3
 * — l'utilisateur doit pouvoir « désactiver la géolocalisation à tout moment
 * et supprimer sa position enregistrée »). Ne supprime pas le compte ni la
 * ville en texte libre — uniquement les coordonnées précises.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const updated = await clearUserPosition(user.id)
  return { user: await toPublicUser(updated) }
})
