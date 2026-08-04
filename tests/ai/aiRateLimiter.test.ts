import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isRateLimited } from '~~/server/utils/aiRateLimiter'

/**
 * Depuis l'audit M4, le rate-limiter est persisté en base (fenêtre fixe) : les
 * appels sont désormais asynchrones. Clés uniques par test (randomUUID) pour
 * l'isolation, le `test.db` étant partagé entre workers parallèles.
 */
describe('isRateLimited (#geoloc, 2.2, maîtrise des coûts IA)', () => {
  it('autorise les requêtes tant que la limite n’est pas atteinte', async () => {
    const key = randomUUID()
    expect(await isRateLimited(key, 3)).toBe(false)
    expect(await isRateLimited(key, 3)).toBe(false)
    expect(await isRateLimited(key, 3)).toBe(false)
  })

  it('bloque une fois la limite atteinte, pour cette clé uniquement', async () => {
    const key = randomUUID()
    const otherKey = randomUUID()
    expect(await isRateLimited(key, 2)).toBe(false)
    expect(await isRateLimited(key, 2)).toBe(false)
    expect(await isRateLimited(key, 2)).toBe(true)
    // Une autre clé (autre utilisateur/IP) n'est pas affectée par ce quota.
    expect(await isRateLimited(otherKey, 2)).toBe(false)
  })

  it('libère à nouveau la clé une fois la fenêtre écoulée', async () => {
    const key = randomUUID()
    expect(await isRateLimited(key, 1, 20)).toBe(false)
    expect(await isRateLimited(key, 1, 20)).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(await isRateLimited(key, 1, 20)).toBe(false)
  })
})
