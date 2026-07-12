import { describe, expect, it } from 'vitest'
import {
  addMessage,
  findOrCreateConversation,
  getMessages,
  listConversationsForUser,
} from '~~/server/utils/conversationStore'

/** Attend le prochain tick d'horloge pour garantir des `createdAt` distincts et déterministes. */
function tick() {
  const start = Date.now()
  while (Date.now() === start) {
    // busy-wait volontaire : le store utilise Date.now() en interne, sans horloge injectable.
  }
}

describe('conversationStore (#59 API backend — messagerie)', () => {
  it('crée une conversation de façon idempotente pour la même paire client/prestataire', () => {
    const first = findOrCreateConversation('client-1', 'p01')
    const second = findOrCreateConversation('client-1', 'p01')
    expect(second.id).toBe(first.id)
  })

  it('crée des conversations distinctes pour des paires différentes', () => {
    const withProvider1 = findOrCreateConversation('client-2', 'p01')
    const withProvider2 = findOrCreateConversation('client-2', 'p02')
    expect(withProvider1.id).not.toBe(withProvider2.id)
  })

  it('isole les conversations par utilisateur (un tiers ne voit pas les conversations des autres)', () => {
    const conversation = findOrCreateConversation('client-3', 'p03')

    const clientView = listConversationsForUser('client-3')
    const providerView = listConversationsForUser('p03')
    const strangerView = listConversationsForUser('someone-else')

    expect(clientView.some((c) => c.id === conversation.id)).toBe(true)
    expect(providerView.some((c) => c.id === conversation.id)).toBe(true)
    expect(strangerView.some((c) => c.id === conversation.id)).toBe(false)
  })

  it('conserve les messages en ordre chronologique', () => {
    const conversation = findOrCreateConversation('client-4', 'p04')
    addMessage(conversation.id, 'client-4', 'client', 'Bonjour, êtes-vous disponible ?')
    addMessage(conversation.id, 'p04', 'prestataire', 'Oui, je peux passer demain.')
    addMessage(conversation.id, 'client-4', 'client', 'Parfait, à demain.')

    const messages = getMessages(conversation.id)
    expect(messages.map((m) => m.body)).toEqual([
      'Bonjour, êtes-vous disponible ?',
      'Oui, je peux passer demain.',
      'Parfait, à demain.',
    ])
    const timestamps = messages.map((m) => m.createdAt)
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1] as number)
    }
  })

  it('trie les conversations par dernier message décroissant', () => {
    const older = findOrCreateConversation('client-5', 'p05')
    const newer = findOrCreateConversation('client-5', 'p06')
    addMessage(older.id, 'client-5', 'client', 'Premier message')
    tick()
    addMessage(newer.id, 'client-5', 'client', 'Message plus récent')

    const list = listConversationsForUser('client-5')
    expect(list[0]?.id).toBe(newer.id)
  })
})
