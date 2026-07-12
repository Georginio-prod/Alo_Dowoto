/**
 * Store en mémoire pour les favoris client → prestataire (#65). Suffisant
 * pour ce lot (pas de base de données encore en place, voir #45/#46).
 */

export interface Favorite {
  clientId: string
  providerId: string
  createdAt: number
}

const favoritesByClientId = new Map<string, Map<string, Favorite>>()

function bucket(clientId: string): Map<string, Favorite> {
  let clientFavorites = favoritesByClientId.get(clientId)
  if (!clientFavorites) {
    clientFavorites = new Map()
    favoritesByClientId.set(clientId, clientFavorites)
  }
  return clientFavorites
}

/** Ajoute un favori. Idempotent : un second appel ne duplique rien et ne réinitialise pas `createdAt`. */
export function addFavorite(clientId: string, providerId: string): Favorite {
  const clientFavorites = bucket(clientId)
  const existing = clientFavorites.get(providerId)
  if (existing) return existing

  const favorite: Favorite = { clientId, providerId, createdAt: Date.now() }
  clientFavorites.set(providerId, favorite)
  return favorite
}

/** Retire un favori. Idempotent : retirer un favori absent ne lève pas d'erreur. */
export function removeFavorite(clientId: string, providerId: string): void {
  favoritesByClientId.get(clientId)?.delete(providerId)
}

/** Liste les favoris d'un client, du plus récent au plus ancien. */
export function listFavorites(clientId: string): Favorite[] {
  return Array.from(favoritesByClientId.get(clientId)?.values() ?? []).sort((a, b) => b.createdAt - a.createdAt)
}

export function isFavorite(clientId: string, providerId: string): boolean {
  return favoritesByClientId.get(clientId)?.has(providerId) ?? false
}
