/**
 * Limitation de débit de l'assistant IA (#geoloc, 2.2) — fenêtre fixe en
 * mémoire, même principe que server/utils/quotaStore.ts (aucune base de
 * données nécessaire pour ce volume). Clé par utilisateur connecté, ou par
 * adresse IP pour un visiteur anonyme (voir server/api/assistant/chat.post.ts).
 */
const WINDOW_MS = 60_000
export const AI_RATE_LIMIT_PER_WINDOW = 8

const requestTimestampsByKey = new Map<string, number[]>()

/**
 * Enregistre une requête pour `key` et indique si la limite est dépassée.
 * Purge les horodatages hors fenêtre à chaque appel — pas de tâche planifiée
 * nécessaire, la carte reste bornée par le nombre de clés actives récentes.
 */
export function isRateLimited(
  key: string,
  limit: number = AI_RATE_LIMIT_PER_WINDOW,
  windowMs: number = WINDOW_MS,
): boolean {
  const now = Date.now()
  const recentTimestamps = (requestTimestampsByKey.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs)

  if (recentTimestamps.length >= limit) {
    requestTimestampsByKey.set(key, recentTimestamps)
    return true
  }

  recentTimestamps.push(now)
  requestTimestampsByKey.set(key, recentTimestamps)
  return false
}
