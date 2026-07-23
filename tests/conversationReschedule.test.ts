import { describe, expect, it } from 'vitest'
import {
  addMessage,
  findLatestUnresolvedMessage,
  findOrCreateConversation,
  resolveMessage,
} from '~~/server/utils/conversationStore'

/** Attend le prochain tick d'horloge pour garantir des `createdAt` distincts et déterministes (voir conversationStore.test.ts). */
function tick() {
  const start = Date.now()
  while (Date.now() === start) {
    // busy-wait volontaire : le store utilise Date.now() en interne, sans horloge injectable.
  }
}

describe('conversationStore — proposition de nouveau créneau (#270)', () => {
  it('addMessage stocke l’horodatage proposé pour un message reschedule_request', async () => {
    const conversation = await findOrCreateConversation('client-40', 'p40')
    const proposedAt = Date.now() + 24 * 60 * 60 * 1000
    const message = await addMessage(conversation.id, 'p40', 'prestataire', 'Nouveau créneau proposé', {
      kind: 'reschedule_request',
      proposedAt,
    })

    expect(message.kind).toBe('reschedule_request')
    expect(message.proposedAt).toBe(proposedAt)
    expect(message.resolvedAt).toBeNull()
  })

  it('un message texte classique n’a pas d’horodatage proposé', async () => {
    const conversation = await findOrCreateConversation('client-41', 'p41')
    const message = await addMessage(conversation.id, 'client-41', 'client', 'Bonjour')

    expect(message.proposedAt).toBeNull()
  })

  it('findLatestUnresolvedMessage retrouve la dernière proposition de créneau non résolue', async () => {
    const conversation = await findOrCreateConversation('client-42', 'p42')
    await addMessage(conversation.id, 'p42', 'prestataire', 'Premier créneau', { kind: 'reschedule_request', proposedAt: Date.now() + 1000 })
    tick()
    const latest = await addMessage(conversation.id, 'p42', 'prestataire', 'Second créneau', { kind: 'reschedule_request', proposedAt: Date.now() + 2000 })

    const found = await findLatestUnresolvedMessage(conversation.id, 'reschedule_request')
    expect(found?.id).toBe(latest.id)
  })

  it('resolveMessage marque la proposition comme confirmée', async () => {
    const conversation = await findOrCreateConversation('client-43', 'p43')
    const message = await addMessage(conversation.id, 'p43', 'prestataire', 'Nouveau créneau', { kind: 'reschedule_request', proposedAt: Date.now() + 1000 })

    const resolved = await resolveMessage(conversation.id, message.id)

    expect(resolved?.resolvedAt).not.toBeNull()
    expect(await findLatestUnresolvedMessage(conversation.id, 'reschedule_request')).toBeNull()
  })
})
