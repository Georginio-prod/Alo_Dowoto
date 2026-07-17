import type { FavoriteConversationEntry, FavoriteSource } from '~/utils/favoriteConversations'
import { buildFavoriteEntries } from '~/utils/favoriteConversations'

/**
 * État de la barre de raccourci messagerie (#225) : croise les favoris du
 * chercheur (`/api/favorites`) avec ses conversations (`useConversations`,
 * déjà partagée avec la liste de la messagerie) pour obtenir, par
 * prestataire favori, le lien direct vers sa conversation et son compteur
 * de non-lus. Même schéma `useState` + `ensure`/`refresh` que `useWallet.ts`.
 */
export function useFavoriteConversations() {
  const entries = useState<FavoriteConversationEntry[]>('favorite-conversations', () => [])
  const loaded = useState('favorite-conversations-loaded', () => false)
  const pending = useState('favorite-conversations-pending', () => false)
  const requestFetch = useRequestFetch()
  const { conversations, refresh: refreshConversations } = useConversations()

  async function refresh() {
    pending.value = true
    try {
      const [{ favorites }] = await Promise.all([
        requestFetch<{ favorites: FavoriteSource[] }>('/api/favorites'),
        refreshConversations(),
      ])
      entries.value = buildFavoriteEntries(favorites, conversations.value)
    } catch {
      entries.value = []
    } finally {
      pending.value = false
      loaded.value = true
    }
  }

  async function ensure() {
    if (!loaded.value) await refresh()
  }

  const totalUnread = computed(() => entries.value.reduce((sum, entry) => sum + entry.unreadCount, 0))

  return { entries, totalUnread, loaded, pending, refresh, ensure }
}
