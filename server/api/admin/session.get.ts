/**
 * Vérifie le jeton porté par le dashboard admin au démarrage de
 * l'application : renvoie l'admin courant, ou 401/403 si le jeton est
 * expiré/invalide/non-admin (l'app redemande alors une connexion).
 */
export default defineEventHandler(async (event) => {
  return { user: toPublicUser(await requireAdminRole(event)) }
})
