/**
 * Modification du profil (nom d'utilisateur, prénom, nom, localisation)
 * depuis « Mon espace » — mêmes champs et mêmes règles de validation que
 * ceux collectés à l'inscription (voir findOrCreateUser).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const { username, firstName, lastName, location } = await readSchemaBody(event, updateProfileSchema)

  const updated = await updateUserProfile(user.id, { username, firstName, lastName, location })
  return { user: toPublicUser(updated) }
})
