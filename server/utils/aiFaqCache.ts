/**
 * Cache des réponses de l'assistant IA (#geoloc, 2.3, maîtrise des coûts) —
 * uniquement pour les échanges n'ayant déclenché aucun outil (FAQ/navigation
 * pure) : une recommandation de prestataire dépend de la position et de
 * l'instant de la demande (disponibilité), donc jamais mise en cache, voir
 * server/api/assistant/chat.post.ts qui ne consulte ce cache que dans ce cas.
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
