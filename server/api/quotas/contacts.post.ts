/**
 * Incrémente le compteur de contacts du mois courant (appelé quand le
 * client clique sur « Contacter » depuis les résultats de matching, #56).
 *
 * Le blocage au-delà du quota gratuit (3/mois) est géré côté #63, une fois
 * l'affichage du quota et le bouton « Contacter » disponibles côté client.
 */
export default defineEventHandler((event) => {
  const user = requireClientRole(event)
  const result = incrementClientContacts(user.id)
  return { usage: { ...result, limit: CLIENT_CONTACTS_MONTHLY_LIMIT } }
})
