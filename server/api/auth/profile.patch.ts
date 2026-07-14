interface UpdateProfileBody {
  username?: string
  firstName?: string
  lastName?: string
  location?: string
}

/**
 * Modification du profil (nom d'utilisateur, prénom, nom, localisation)
 * depuis « Mon espace » — mêmes champs et mêmes règles de validation que
 * ceux collectés à l'inscription (voir findOrCreateUser).
 */
export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)

  const body = await readBody<UpdateProfileBody>(event)
  const username = body?.username?.trim() ?? ''
  const firstName = body?.firstName?.trim() ?? ''
  const lastName = body?.lastName?.trim() ?? ''
  const location = body?.location?.trim() ?? ''

  if (!username || !firstName || !lastName || !location) {
    badRequest("Nom d'utilisateur, prénom, nom et localisation sont requis.")
  }

  const updated = updateUserProfile(user.id, { username, firstName, lastName, location })
  return { user: toPublicUser(updated) }
})
