import { describe, expect, it } from 'vitest'
import {
  addMessage,
  findLatestUnresolvedMessage,
  findOrCreateConversation,
  resolveMessage,
} from '~~/server/utils/conversationStore'

describe('conversationStore — proposition de nouveau créneau (#270)', () => {
  it('addMessage stocke l’horodatage proposé pour un message reschedule_request', () => {
    const conversation = findOrCreateConversation('client-40', 'p40')
    const proposedAt = Date.now() + 24 * 60 * 60 * 1000
    const message = addMessage(conversation.id, 'p40', 'prestataire', 'Nouveau créneau proposé', {
      kind: 'reschedule_request',
      proposedAt,
    })

    expect(message.kind).toBe('reschedule_request')
    expect(message.proposedAt).toBe(proposedAt)
    expect(message.resolvedAt).toBeNull()
  })

  it('un message texte classique n’a pas d’horodatage proposé', () => {
    const conversation = findOrCreateConversation('client-41', 'p41')
    const message = addMessage(conversation.id, 'client-41', 'client', 'Bonjour')

    expect(message.proposedAt).toBeNull()
  })

  it('findLatestUnresolvedMessage retrouve la dernière proposition de créneau non résolue', () => {
    const conversation = findOrCreateConversation('client-42', 'p42')
    addMessage(conversation.id, 'p42', 'prestataire', 'Premier créneau', { kind: 'reschedule_request', proposedAt: Date.now() + 1000 })
    const latest = addMessage(conversation.id, 'p42', 'prestataire', 'Second créneau', { kind: 'reschedule_request', proposedAt: Date.now() + 2000 })

    const found = findLatestUnresolvedMessage(conversation.id, 'reschedule_request')
    expect(found?.id).toBe(latest.id)
  })

  it('resolveMessage marque la proposition comme confirmée', () => {
    const conversation = findOrCreateConversation('client-43', 'p43')
    const message = addMessage(conversation.id, 'p43', 'prestataire', 'Nouveau créneau', { kind: 'reschedule_request', proposedAt: Date.now() + 1000 })

    const resolved = resolveMessage(conversation.id, message.id)

    expect(resolved?.resolvedAt).not.toBeNull()
    expect(findLatestUnresolvedMessage(conversation.id, 'reschedule_request')).toBeNull()
  })
})
