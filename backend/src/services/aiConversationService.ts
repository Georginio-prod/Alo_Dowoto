import type { AiMessage } from './ai/types'

/**
 * Historique de conversation de l'assistant IA par clé (#geoloc, 2.2), porté
 * **iso** depuis `server/utils/aiConversationStore.ts` (ADR-0016) — **en mémoire**
 * comme Nitro (même comportement volatile). La clé est l'id d'un compte réel ou
 * une clé anonyme (adresse IP) pour un visiteur non connecté.
 */
const MAX_HISTORY_MESSAGES = 20

const historyByKey = new Map<string, AiMessage[]>()

export function getConversationHistory(key: string): AiMessage[] {
  return historyByKey.get(key) ?? []
}

/** Ajoute un tour (message utilisateur + réponse assistant) et tronque l'historique conservé. */
export function appendConversationTurn(key: string, userMessage: AiMessage, assistantMessage: AiMessage): AiMessage[] {
  const history = [...getConversationHistory(key), userMessage, assistantMessage].slice(-MAX_HISTORY_MESSAGES)
  historyByKey.set(key, history)
  return history
}

export function clearConversationHistory(key: string): void {
  historyByKey.delete(key)
}
