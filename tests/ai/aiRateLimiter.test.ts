import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    // Horloge figée : les deux premiers appels partagent le MÊME instant, donc
    // la même fenêtre de 150 ms. Avec l'horloge réelle, sous la latence de la
    // base en CI, ils pouvaient chevaucher une frontière de fenêtre et rendre le
    // test flaky (« expected false to be true »). L'avance explicite de 300 ms
    // (deux fenêtres) teste la libération sans attente réelle. Le limiteur n'est
    // pas modifié — c'est un correctif de déterminisme du test uniquement.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const key = randomUUID()
    expect(await isRateLimited(key, 1, 150)).toBe(false)
    expect(await isRateLimited(key, 1, 150)).toBe(true)
    vi.setSystemTime(new Date('2026-01-01T00:00:00.300Z'))
    expect(await isRateLimited(key, 1, 150)).toBe(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
