import { describe, expect, it } from 'vitest'
import {
  addMessage,
  addSystemMessage,
  findLatestUnresolvedMessage,
  findOrCreateConversation,
  getClientContact,
  getMessages,
  listConversationsForUser,
  markConversationRead,
  markFirstContactDone,
  resolveMessage,
  setClientContact,
  toConversationSummary,
  WORKTOGO_SYSTEM_SENDER_ID,
} from '~~/server/utils/conversationStore'

/** Attend le prochain tick d'horloge pour garantir des `createdAt` distincts et déterministes. */
function tick() {
  const start = Date.now()
  while (Date.now() === start) {
    // busy-wait volontaire : le store utilise Date.now() en interne, sans horloge injectable.
  }
}

describe('conversationStore (#59 API backend — messagerie)', () => {
  it('crée une conversation de façon idempotente pour la même paire client/prestataire', async () => {
    const first = await findOrCreateConversation('client-1', 'p01')
    const second = await findOrCreateConversation('client-1', 'p01')
    expect(second.id).toBe(first.id)
  })

  it('crée des conversations distinctes pour des paires différentes', async () => {
    const withProvider1 = await findOrCreateConversation('client-2', 'p01')
    const withProvider2 = await findOrCreateConversation('client-2', 'p02')
    expect(withProvider1.id).not.toBe(withProvider2.id)
  })

  it('isole les conversations par utilisateur (un tiers ne voit pas les conversations des autres)', async () => {
    const conversation = await findOrCreateConversation('client-3', 'p03')

    const clientView = await listConversationsForUser('client-3')
    const providerView = await listConversationsForUser('p03')
    const strangerView = await listConversationsForUser('someone-else')

    expect(clientView.some((c) => c.id === conversation.id)).toBe(true)
    expect(providerView.some((c) => c.id === conversation.id)).toBe(true)
    expect(strangerView.some((c) => c.id === conversation.id)).toBe(false)
  })

  it('conserve les messages en ordre chronologique', async () => {
    const conversation = await findOrCreateConversation('client-4', 'p04')
    await addMessage(conversation.id, 'client-4', 'client', 'Bonjour, êtes-vous disponible ?')
    await addMessage(conversation.id, 'p04', 'prestataire', 'Oui, je peux passer demain.')
    await addMessage(conversation.id, 'client-4', 'client', 'Parfait, à demain.')

    const messages = await getMessages(conversation.id)
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

  it('trie les conversations par dernier message décroissant', async () => {
    const older = await findOrCreateConversation('client-5', 'p05')
    const newer = await findOrCreateConversation('client-5', 'p06')
    await addMessage(older.id, 'client-5', 'client', 'Premier message')
    tick()
    await addMessage(newer.id, 'client-5', 'client', 'Message plus récent')

    const list = await listConversationsForUser('client-5')
    expect(list[0]?.id).toBe(newer.id)
  })
})

describe('conversationStore — première prise de contact (#129)', () => {
  it("une nouvelle conversation n'a pas encore de première prise de contact", async () => {
    const conversation = await findOrCreateConversation('client-6', 'p07')
    expect(conversation.firstContactDone).toBe(false)
  })

  it('markFirstContactDone ne s’applique qu’à la conversation ciblée', async () => {
    const target = await findOrCreateConversation('client-7', 'p08')
    const other = await findOrCreateConversation('client-7', 'p09')

    await markFirstContactDone(target.id)

    const targetAfter = await findOrCreateConversation('client-7', 'p08')
    const otherAfter = await findOrCreateConversation('client-7', 'p09')
    expect(targetAfter.firstContactDone).toBe(true)
    expect(otherAfter.firstContactDone).toBe(false)
    void other
  })

  it('ignore silencieusement un id de conversation inconnu (cas limite)', async () => {
    await expect(markFirstContactDone('id-inexistant')).resolves.not.toThrow()
  })
})

describe('conversationStore — coordonnées du chercheur (#264, anti-fuite)', () => {
  it("une nouvelle conversation n'a pas encore de contact enregistré", async () => {
    const conversation = await findOrCreateConversation('client-30', 'p30')
    expect(await getClientContact(conversation.id)).toBeNull()
  })

  it('setClientContact enregistre le contact brut, récupérable via getClientContact', async () => {
    const conversation = await findOrCreateConversation('client-31', 'p31')
    await setClientContact(conversation.id, '+228 90 12 34 56')
    expect(await getClientContact(conversation.id)).toBe('+228 90 12 34 56')
  })

  it('ignore silencieusement un id de conversation inconnu (cas limite)', async () => {
    await expect(setClientContact('id-inexistant', '90123456')).resolves.not.toThrow()
    expect(await getClientContact('id-inexistant')).toBeNull()
  })
})

describe('conversationStore — compteur de non-lus (#225, barre de raccourci messagerie)', () => {
  it("compte les messages de l'autre partie comme non lus tant que le fil n'a jamais été consulté", async () => {
    const conversation = await findOrCreateConversation('client-10', 'p10')
    await addMessage(conversation.id, 'client-10', 'client', 'Bonjour')
    await addMessage(conversation.id, 'p10', 'prestataire', 'Bonjour, je suis disponible.')
    await addMessage(conversation.id, 'p10', 'prestataire', 'Vous êtes toujours intéressé ?')

    const summary = await toConversationSummary(conversation, 'client-10')
    // Le message du client lui-même ne compte pas comme non lu de son propre point de vue.
    expect(summary.unreadCount).toBe(2)
  })

  it('remet le compteur à zéro pour le lecteur après markConversationRead', async () => {
    const conversation = await findOrCreateConversation('client-11', 'p11')
    await addMessage(conversation.id, 'p11', 'prestataire', 'Disponible dès demain.')

    await markConversationRead(conversation.id, 'client-11')

    const summary = await toConversationSummary(conversation, 'client-11')
    expect(summary.unreadCount).toBe(0)
  })

  it("ne compte que les messages reçus après la dernière lecture, pas les anciens ni ceux de l'autre côté", async () => {
    const conversation = await findOrCreateConversation('client-12', 'p12')
    await addMessage(conversation.id, 'p12', 'prestataire', 'Premier message, déjà lu.')
    await markConversationRead(conversation.id, 'client-12')
    tick()
    await addMessage(conversation.id, 'p12', 'prestataire', 'Nouveau message après lecture.')

    const clientSummary = await toConversationSummary(conversation, 'client-12')
    expect(clientSummary.unreadCount).toBe(1)

    // Le prestataire ne doit jamais voir ses propres messages comptés comme non lus.
    const providerSummary = await toConversationSummary(conversation, 'p12')
    expect(providerSummary.unreadCount).toBe(0)
  })

  it('markConversationRead ne s’applique qu’au lecteur ciblé, pas à l’autre partie', async () => {
    const conversation = await findOrCreateConversation('client-13', 'p13')
    await addMessage(conversation.id, 'client-13', 'client', 'Bonjour, disponible ?')

    await markConversationRead(conversation.id, 'client-13')

    const providerSummary = await toConversationSummary(conversation, 'p13')
    expect(providerSummary.unreadCount).toBe(1)
  })
})

describe('conversationStore — secteur du prestataire (#295, fiche différenciée par métier)', () => {
  it('expose le slug de secteur du prestataire (annuaire de démo) côté client', async () => {
    const conversation = await findOrCreateConversation('client-40', 'p09') // p09 : sector 'btp'
    const summary = await toConversationSummary(conversation, 'client-40')
    expect(summary.sectorSlug).toBe('btp')
  })

  it('renvoie null côté prestataire (pas de secteur pour un chercheur)', async () => {
    const conversation = await findOrCreateConversation('client-41', 'p10')
    const summary = await toConversationSummary(conversation, 'p10')
    expect(summary.sectorSlug).toBeNull()
  })

  it("renvoie null quand le prestataire n'est pas dans l'annuaire de démo (cas limite)", async () => {
    const conversation = await findOrCreateConversation('client-42', 'provider-inconnu')
    const summary = await toConversationSummary(conversation, 'client-42')
    expect(summary.sectorSlug).toBeNull()
  })
})

describe('conversationStore — messages automatiques WorkTogo (#hub-messages-automatiques)', () => {
  it('addSystemMessage crée un message attribué à WorkTogo, pas à un utilisateur réel', async () => {
    const conversation = await findOrCreateConversation('client-20', 'p20')
    const message = await addSystemMessage(conversation.id, 'Confirmez-vous la prise en charge ?', 'order_confirmation')

    expect(message.senderId).toBe(WORKTOGO_SYSTEM_SENDER_ID)
    expect(message.senderRole).toBe('system')
    expect(message.kind).toBe('order_confirmation')
    expect(message.resolvedAt).toBeNull()
  })

  it('un message texte classique a le type "text" et n’est jamais actionnable', async () => {
    const conversation = await findOrCreateConversation('client-21', 'p21')
    const message = await addMessage(conversation.id, 'client-21', 'client', 'Bonjour')

    expect(message.kind).toBe('text')
    expect(message.location).toBeNull()
  })

  it('findLatestUnresolvedMessage retrouve le dernier message actionnable non résolu de ce type', async () => {
    const conversation = await findOrCreateConversation('client-22', 'p22')
    await addSystemMessage(conversation.id, 'Première demande de confirmation', 'order_confirmation')
    tick()
    const latest = await addSystemMessage(conversation.id, 'Seconde demande de confirmation', 'order_confirmation')

    const found = await findLatestUnresolvedMessage(conversation.id, 'order_confirmation')
    expect(found?.id).toBe(latest.id)
  })

  it('findLatestUnresolvedMessage ignore les messages déjà résolus', async () => {
    const conversation = await findOrCreateConversation('client-23', 'p23')
    const message = await addSystemMessage(conversation.id, 'Confirmez-vous la prise en charge ?', 'order_confirmation')
    await resolveMessage(conversation.id, message.id)

    expect(await findLatestUnresolvedMessage(conversation.id, 'order_confirmation')).toBeNull()
  })

  it('findLatestUnresolvedMessage renvoie null quand aucun message de ce type n’existe (cas limite)', async () => {
    const conversation = await findOrCreateConversation('client-24', 'p24')
    expect(await findLatestUnresolvedMessage(conversation.id, 'location_request')).toBeNull()
  })

  it('resolveMessage marque le message comme résolu et renvoie null pour un id inconnu', async () => {
    const conversation = await findOrCreateConversation('client-25', 'p25')
    const message = await addSystemMessage(conversation.id, 'Confirmez-vous la prise en charge ?', 'order_confirmation')

    const resolved = await resolveMessage(conversation.id, message.id)
    expect(resolved?.resolvedAt).not.toBeNull()
    expect(await resolveMessage(conversation.id, 'id-inexistant')).toBeNull()
  })

  it('addMessage stocke les coordonnées d’un message de localisation partagée', async () => {
    const conversation = await findOrCreateConversation('client-26', 'p26')
    const message = await addMessage(conversation.id, 'client-26', 'client', '📍 Localisation partagée avec le prestataire.', {
      kind: 'location_shared',
      location: { lat: 6.1319, lng: 1.2228 },
    })

    expect(message.kind).toBe('location_shared')
    expect(message.location).toEqual({ lat: 6.1319, lng: 1.2228 })
  })
})
