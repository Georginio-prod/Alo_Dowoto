import { describe, expect, it } from 'vitest'
import { buildFavoriteEntries, type FavoriteSource } from '~/utils/favoriteConversations'
import type { ConversationSummary } from '~~/server/utils/conversationStore'

function favorite(overrides: Partial<FavoriteSource> = {}): FavoriteSource {
  return {
    providerId: 'p01',
    createdAt: 1_000,
    provider: { displayName: 'Akofa M.', photoUrl: null },
    ...overrides,
  }
}

function conversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: 'c1',
    clientId: 'client-1',
    providerId: 'p01',
    createdAt: 1_000,
    firstContactDone: true,
    otherPartyName: 'Akofa M.',
    otherPartySector: 'Ménage',
    sectorSlug: 'menage',
    lastMessage: null,
    alreadyReviewed: false,
    unreadCount: 0,
    ...overrides,
  }
}

describe('buildFavoriteEntries (#225 barre de raccourci messagerie)', () => {
  it('associe un favori à sa conversation existante (lien direct, compteur de non-lus)', () => {
    const entries = buildFavoriteEntries(
      [favorite({ providerId: 'p01' })],
      [conversation({ id: 'conv-1', providerId: 'p01', unreadCount: 3 })],
    )

    expect(entries).toEqual([
      expect.objectContaining({ providerId: 'p01', conversationId: 'conv-1', unreadCount: 3 }),
    ])
  })

  it("laisse conversationId à null pour un favori jamais contacté (pas de conversation)", () => {
    const entries = buildFavoriteEntries([favorite({ providerId: 'p02' })], [])
    expect(entries[0]?.conversationId).toBeNull()
    expect(entries[0]?.unreadCount).toBe(0)
  })

  it('ignore un favori dont la fiche prestataire a disparu (rien à afficher)', () => {
    const entries = buildFavoriteEntries([favorite({ providerId: 'p03', provider: null })], [])
    expect(entries).toHaveLength(0)
  })

  it('trie par date du dernier message décroissante quand une conversation existe', () => {
    const entries = buildFavoriteEntries(
      [
        favorite({ providerId: 'older-conv', createdAt: 500 }),
        favorite({ providerId: 'newer-conv', createdAt: 100 }),
      ],
      [
        conversation({ id: 'c-old', providerId: 'older-conv', lastMessage: { body: 'Hier', createdAt: 2_000 } }),
        conversation({ id: 'c-new', providerId: 'newer-conv', lastMessage: { body: 'À l’instant', createdAt: 9_000 } }),
      ],
    )

    expect(entries.map((entry) => entry.providerId)).toEqual(['newer-conv', 'older-conv'])
  })

  it('retombe sur la date de mise en favori quand il n’y a pas encore de message (cas limite)', () => {
    const entries = buildFavoriteEntries(
      [
        favorite({ providerId: 'favorited-first', createdAt: 100 }),
        favorite({ providerId: 'favorited-last', createdAt: 900 }),
      ],
      [],
    )

    expect(entries.map((entry) => entry.providerId)).toEqual(['favorited-last', 'favorited-first'])
  })

  it('place une conversation avec message récent avant un favori sans conversation, même mis en favori plus tard', () => {
    const entries = buildFavoriteEntries(
      [
        favorite({ providerId: 'has-conversation', createdAt: 100 }),
        favorite({ providerId: 'no-conversation-yet', createdAt: 5_000 }),
      ],
      [conversation({ id: 'c1', providerId: 'has-conversation', lastMessage: { body: 'Salut', createdAt: 6_000 } })],
    )

    expect(entries.map((entry) => entry.providerId)).toEqual(['has-conversation', 'no-conversation-yet'])
  })
})
