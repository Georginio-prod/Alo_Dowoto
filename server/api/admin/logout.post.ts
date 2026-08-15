/**
 * Déconnexion du dashboard admin : invalide le jeton de session courant
 * (porté en Authorization: Bearer). Exige un admin authentifié pour éviter
 * qu'un jeton arbitraire soit détruit à l'aveugle.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const header = getHeader(event, 'authorization')
  const token = header && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined
  await destroySession(token)

  return { ok: true }
})
