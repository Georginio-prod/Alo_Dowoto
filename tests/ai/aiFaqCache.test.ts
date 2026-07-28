import { describe, expect, it, vi } from 'vitest'
import { getCachedAssistantAnswer, setCachedAssistantAnswer } from '~~/server/utils/aiFaqCache'

describe('aiFaqCache (#geoloc, 2.3, maîtrise des coûts — questions fréquentes)', () => {
  it('renvoie null pour une question jamais mise en cache', () => {
    expect(getCachedAssistantAnswer('question jamais posée')).toBeNull()
  })

  it('renvoie la réponse mise en cache, indépendamment de la casse/espaces', () => {
    setCachedAssistantAnswer('Comment ça marche ?', 'Réponse en cache.')
    expect(getCachedAssistantAnswer('  comment ça marche ?  ')).toBe('Réponse en cache.')
  })

  it('expire après le délai de vie du cache', () => {
    vi.useFakeTimers()
    try {
      setCachedAssistantAnswer('question expirable', 'réponse')
      expect(getCachedAssistantAnswer('question expirable')).toBe('réponse')

      vi.advanceTimersByTime(61 * 60 * 1000)
      expect(getCachedAssistantAnswer('question expirable')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
