/**
 * Cache des réponses de l'assistant IA (#geoloc, 2.3, maîtrise des coûts), porté
 * **iso** depuis `server/utils/aiFaqCache.ts` (ADR-0016) — **en mémoire** comme
 * Nitro. Uniquement pour les échanges n'ayant déclenché aucun outil (FAQ pure) :
 * une recommandation dépend de la position et de l'instant, donc jamais mise en
 * cache (voir le contrôleur assistant).
 */
const TTL_MS = 60 * 60 * 1000

interface CacheEntry {
  text: string
  expiresAt: number
}

const cacheByQuestion = new Map<string, CacheEntry>()

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function getCachedAssistantAnswer(question: string): string | null {
  const entry = cacheByQuestion.get(normalize(question))
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.text
}

export function setCachedAssistantAnswer(question: string, text: string): void {
  cacheByQuestion.set(normalize(question), { text, expiresAt: Date.now() + TTL_MS })
}
