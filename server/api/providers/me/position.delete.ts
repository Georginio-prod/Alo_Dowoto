/**
 * Supprime la position GPS précise enregistrée du prestataire connecté
 * (#geoloc, partie 3) — équivalent, côté prestataire, de DELETE /api/auth/position.
 */
export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)
  const updated = clearProviderPosition(user.id)
  if (!updated) notFound('Profil prestataire introuvable.')
  return { profile: updated }
})
