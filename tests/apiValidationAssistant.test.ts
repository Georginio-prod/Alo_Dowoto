import { describe, expect, it } from 'vitest'
import { assistantChatSchema, MAX_ASSISTANT_MESSAGE_LENGTH } from '~~/server/utils/apiValidationAssistant'

describe('assistantChatSchema (validation POST /api/assistant/chat, #geoloc)', () => {
  it('accepte un message simple', () => {
    expect(assistantChatSchema.safeParse({ message: 'Bonjour' }).success).toBe(true)
  })

  it('accepte des coordonnées optionnelles', () => {
    const result = assistantChatSchema.safeParse({ message: 'Bonjour', latitude: 6.13, longitude: 1.22 })
    expect(result.success).toBe(true)
  })

  it('rejette un message vide ou uniquement des espaces', () => {
    expect(assistantChatSchema.safeParse({ message: '' }).success).toBe(false)
    expect(assistantChatSchema.safeParse({ message: '   ' }).success).toBe(false)
  })

  it('rejette un message trop long', () => {
    const tooLong = 'a'.repeat(MAX_ASSISTANT_MESSAGE_LENGTH + 1)
    expect(assistantChatSchema.safeParse({ message: tooLong }).success).toBe(false)
  })

  it('accepte un message à la longueur maximale exacte', () => {
    const maxLength = 'a'.repeat(MAX_ASSISTANT_MESSAGE_LENGTH)
    expect(assistantChatSchema.safeParse({ message: maxLength }).success).toBe(true)
  })
})
