import { describe, expect, it } from 'vitest'
import {
  addMessage,
  findOrCreateConversation,
  getMessages,
  listConversationsForUser,
  markConversationRead,
  markFirstContactDone,
  toConversationSummary,
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

describe('conversationStore — première prise de contact (#129)', () => {
  it("une nouvelle conversation n'a pas encore de première prise de contact", () => {
    const conversation = findOrCreateConversation('client-6', 'p07')
    expect(conversation.firstContactDone).toBe(false)
  })

  it('markFirstContactDone ne s’applique qu’à la conversation ciblée', () => {
    const target = findOrCreateConversation('client-7', 'p08')
    const other = findOrCreateConversation('client-7', 'p09')

    markFirstContactDone(target.id)

    expect(target.firstContactDone).toBe(true)
    expect(other.firstContactDone).toBe(false)
  })

  it('ignore silencieusement un id de conversation inconnu (cas limite)', () => {
    expect(() => markFirstContactDone('id-inexistant')).not.toThrow()
  })
})

describe('conversationStore — compteur de non-lus (#225, barre de raccourci messagerie)', () => {
  it("compte les messages de l'autre partie comme non lus tant que le fil n'a jamais été consulté", async () => {
    const conversation = findOrCreateConversation('client-10', 'p10')
    addMessage(conversation.id, 'client-10', 'client', 'Bonjour')
    addMessage(conversation.id, 'p10', 'prestataire', 'Bonjour, je suis disponible.')
    addMessage(conversation.id, 'p10', 'prestataire', 'Vous êtes toujours intéressé ?')

    const summary = await toConversationSummary(conversation, 'client-10')
    // Le message du client lui-même ne compte pas comme non lu de son propre point de vue.
    expect(summary.unreadCount).toBe(2)
  })

  it('remet le compteur à zéro pour le lecteur après markConversationRead', async () => {
    const conversation = findOrCreateConversation('client-11', 'p11')
    addMessage(conversation.id, 'p11', 'prestataire', 'Disponible dès demain.')

    markConversationRead(conversation.id, 'client-11')

    const summary = await toConversationSummary(conversation, 'client-11')
    expect(summary.unreadCount).toBe(0)
  })

  it("ne compte que les messages reçus après la dernière lecture, pas les anciens ni ceux de l'autre côté", async () => {
    const conversation = findOrCreateConversation('client-12', 'p12')
    addMessage(conversation.id, 'p12', 'prestataire', 'Premier message, déjà lu.')
    markConversationRead(conversation.id, 'client-12')
    tick()
    addMessage(conversation.id, 'p12', 'prestataire', 'Nouveau message après lecture.')

    const clientSummary = await toConversationSummary(conversation, 'client-12')
    expect(clientSummary.unreadCount).toBe(1)

    // Le prestataire ne doit jamais voir ses propres messages comptés comme non lus.
    const providerSummary = await toConversationSummary(conversation, 'p12')
    expect(providerSummary.unreadCount).toBe(0)
  })

  it('markConversationRead ne s’applique qu’au lecteur ciblé, pas à l’autre partie', async () => {
    const conversation = findOrCreateConversation('client-13', 'p13')
    addMessage(conversation.id, 'client-13', 'client', 'Bonjour, disponible ?')

    markConversationRead(conversation.id, 'client-13')

    const providerSummary = await toConversationSummary(conversation, 'p13')
    expect(providerSummary.unreadCount).toBe(1)
  })
})
