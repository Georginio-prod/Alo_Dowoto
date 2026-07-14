import type { ConversationSummary } from '~~/server/utils/conversationStore'

/**
 * Liste des conversations partagée entre la barre latérale (layout
 * `messages`, montée une fois) et le fil actif (`pages/messages/[id].vue`,
 * remonté à chaque changement de conversation) : sans cet état commun, la
 * barre latérale ne verrait jamais l'aperçu du dernier message ni l'ordre
 * de tri se mettre à jour après l'envoi d'un message.
 */
export function useConversations() {
  const conversations = useState<ConversationSummary[]>('conversations-list', () => [])
  const loaded = useState('conversations-loaded', () => false)
  const pending = useState('conversations-pending', () => false)
  // Voir useSession.ts : le `$fetch` global ne transmet pas le cookie de la
  // requête entrante pendant le SSR.
  const requestFetch = useRequestFetch()

  async function refresh() {
    pending.value = true
    try {
      const { conversations: fetched } = await requestFetch<{ conversations: ConversationSummary[] }>(
        '/api/conversations',
      )
      conversations.value = fetched
    } finally {
      pending.value = false
      loaded.value = true
    }
  }

  async function ensure() {
    if (!loaded.value) await refresh()
  }

  return { conversations, loaded, pending, refresh, ensure }
}
