import type { Notification } from '~~/server/utils/notificationStore'

/**
 * Centre de notifications partagé (#360, premier incrément) — même patron
 * que useConversations.ts. Aucun mécanisme de mise à jour en temps réel
 * n'existe dans l'app (pas de websocket/SSE, voir FavoritesMessagingBar.vue) :
 * NotificationBell.vue rafraîchit à intervalle régulier tant qu'il reste
 * monté (donc tant qu'une session existe, l'en-tête restant monté d'une
 * navigation à l'autre).
 */
export function useNotifications() {
  const notifications = useState<Notification[]>('notifications-list', () => [])
  const unreadCount = useState('notifications-unread-count', () => 0)
  const loaded = useState('notifications-loaded', () => false)
  const requestFetch = useRequestFetch()

  async function refresh() {
    try {
      const fetched = await requestFetch<{ notifications: Notification[]; unreadCount: number }>('/api/notifications')
      notifications.value = fetched.notifications
      unreadCount.value = fetched.unreadCount
    } finally {
      loaded.value = true
    }
  }

  async function ensure() {
    if (!loaded.value) await refresh()
  }

  /** Marque tout comme lu côté serveur, et reflète immédiatement le badge sans attendre le prochain refresh. */
  async function markAllRead() {
    if (unreadCount.value === 0) return
    unreadCount.value = 0
    await requestFetch('/api/notifications/read', { method: 'POST' })
  }

  return { notifications, unreadCount, loaded, refresh, ensure, markAllRead }
}
