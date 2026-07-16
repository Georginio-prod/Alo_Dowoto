/**
 * Incrémente le compteur de contacts du mois courant (appelé quand le
 * client clique sur « Contacter » depuis les résultats de matching, #56).
 *
 * Une fois le quota gratuit (3/mois) atteint, on ne laisse jamais remonter
 * une 500 brute : on répond explicitement 429 avec un message clair (#63),
 * que le bouton « Contacter » du client utilise pour se désactiver.
 */
export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)

  const usage = getClientContactsUsage(user.id)
  if (usage.count >= CLIENT_CONTACTS_MONTHLY_LIMIT) {
    tooManyRequests('Quota de contacts atteint ce mois-ci (3 / mois). Réessayez le mois prochain.', { usage })
  }

  const result = incrementClientContacts(user.id)
  return { usage: { ...result, limit: CLIENT_CONTACTS_MONTHLY_LIMIT } }
})
