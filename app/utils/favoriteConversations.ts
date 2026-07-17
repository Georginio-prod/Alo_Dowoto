import type { ConversationSummary } from '~~/server/utils/conversationStore'

export interface FavoriteProviderSummary {
  displayName: string
  photoUrl: string | null
}

export interface FavoriteSource {
  providerId: string
  createdAt: number
  provider: FavoriteProviderSummary | null
}

export interface FavoriteConversationEntry {
  providerId: string
  name: string
  avatarUrl: string | null
  unreadCount: number
  conversationId: string | null
  favoritedAt: number
  lastMessageAt: number | null
}

/**
 * Croise les favoris du chercheur avec ses conversations pour la barre de
 * raccourci messagerie (#225) : un favori jamais contacté n'a pas encore de
 * conversation (`conversationId: null`), un favori dont la fiche annuaire a
 * disparu est ignoré (rien d'affichable — pas de nom, pas d'avatar).
 * Isolée du composable pour rester testable sans dépendre des auto-imports
 * Nuxt (`useState`, `useRequestFetch`).
 */
export function buildFavoriteEntries(
  favorites: FavoriteSource[],
  conversations: ConversationSummary[],
): FavoriteConversationEntry[] {
  const conversationByProviderId = new Map(conversations.map((conversation) => [conversation.providerId, conversation]))

  const entries = favorites
    .filter((favorite): favorite is FavoriteSource & { provider: FavoriteProviderSummary } => favorite.provider !== null)
    .map((favorite) => {
      const conversation = conversationByProviderId.get(favorite.providerId)
      return {
        providerId: favorite.providerId,
        name: favorite.provider.displayName,
        avatarUrl: favorite.provider.photoUrl,
        unreadCount: conversation?.unreadCount ?? 0,
        conversationId: conversation?.id ?? null,
        favoritedAt: favorite.createdAt,
        lastMessageAt: conversation?.lastMessage?.createdAt ?? null,
      }
    })

  return entries.sort((a, b) => (b.lastMessageAt ?? b.favoritedAt) - (a.lastMessageAt ?? a.favoritedAt))
}
