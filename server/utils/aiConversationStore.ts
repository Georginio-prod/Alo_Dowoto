import type { AiMessage } from '~~/server/utils/ai/types'

/**
 * Historique de conversation de l'assistant IA par utilisateur (#geoloc, 2.2)
 * — store en mémoire, même principe que les autres stores non encore migrés
 * vers Prisma (voir server/utils/providerStore.ts). `userId` peut être un
 * identifiant de compte réel ou une clé anonyme (adresse IP, voir
 * server/api/assistant/chat.post.ts) pour un visiteur non connecté.
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
