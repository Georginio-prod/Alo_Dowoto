import { describe, expect, it } from 'vitest'
import { isRateLimited } from '~~/server/utils/aiRateLimiter'

describe('isRateLimited (#geoloc, 2.2, maîtrise des coûts IA)', () => {
  it('autorise les requêtes tant que la limite n’est pas atteinte', () => {
    const key = 'user-under-limit'
    expect(isRateLimited(key, 3)).toBe(false)
    expect(isRateLimited(key, 3)).toBe(false)
    expect(isRateLimited(key, 3)).toBe(false)
  })

  it('bloque une fois la limite atteinte, pour cette clé uniquement', () => {
    const key = 'user-at-limit'
    const otherKey = 'user-other'
    expect(isRateLimited(key, 2)).toBe(false)
    expect(isRateLimited(key, 2)).toBe(false)
    expect(isRateLimited(key, 2)).toBe(true)
    // Une autre clé (autre utilisateur/IP) n'est pas affectée par ce quota.
    expect(isRateLimited(otherKey, 2)).toBe(false)
  })

  it('libère à nouveau la clé une fois la fenêtre écoulée', async () => {
    const key = 'user-short-window'
    expect(isRateLimited(key, 1, 20)).toBe(false)
    expect(isRateLimited(key, 1, 20)).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(isRateLimited(key, 1, 20)).toBe(false)
  })
})
