import { describe, expect, it } from 'vitest'
import { DEFAULT_MATCH_WEIGHTS, rankProviders, scoreProvider, type MatchCandidate, type MatchRequest } from '~~/server/utils/matchingEngine'

const request: MatchRequest = {
  skills: ['Plomberie', 'Urgence'],
  location: 'Lomé',
  budgetMax: 5000,
  urgency: 'immediate',
}

function candidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    providerId: 'p1',
    skills: ['Plomberie', 'Urgence'],
    location: 'Lomé',
    rating: 4.5,
    reviewCount: 20,
    availability: 1,
    priceFrom: 4000,
    ...overrides,
  }
}

describe('scoreProvider (#54 scoring pondéré)', () => {
  it('donne un score élevé à un candidat parfaitement aligné', () => {
    const result = scoreProvider(request, candidate())
    expect(result.total).toBeGreaterThanOrEqual(90)
  })

  it('donne un score bas à un candidat sans compétence, ville ni budget compatible', () => {
    const result = scoreProvider(
      request,
      candidate({ skills: ['Jardinage'], location: 'Kara', priceFrom: 20000, rating: 2, reviewCount: 0, availability: 0.1 }),
    )
    expect(result.total).toBeLessThan(20)
  })

  it('les poids par défaut totalisent 100%', () => {
    const sum = Object.values(DEFAULT_MATCH_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('accepte des poids personnalisés', () => {
    const skillsOnly = { skills: 1, location: 0, reviews: 0, availability: 0, budget: 0 }
    const result = scoreProvider(request, candidate({ skills: [] }), skillsOnly)
    expect(result.total).toBe(0)
  })

  it('le budget ne pénalise pas quand aucun maximum n’est fixé', () => {
    const noBudget: MatchRequest = { ...request, budgetMax: 0 }
    const result = scoreProvider(noBudget, candidate({ priceFrom: 999999 }))
    expect(result.breakdown.budget).toBe(100)
  })
})

describe('rankProviders', () => {
  it('trie par score décroissant et limite au top N', () => {
    const candidates = [
      candidate({ providerId: 'low', skills: [], rating: 1, reviewCount: 0, priceFrom: 50000 }),
      candidate({ providerId: 'high' }),
      candidate({ providerId: 'mid', availability: 0.3 }),
    ]
    const ranked = rankProviders(request, candidates, DEFAULT_MATCH_WEIGHTS, 2)
    expect(ranked).toHaveLength(2)
    expect(ranked[0]?.providerId).toBe('high')
    expect(ranked[0]?.total).toBeGreaterThanOrEqual(ranked[1]?.total ?? 0)
  })

  it('retourne une liste vide sans erreur quand aucun candidat n’est fourni (cas limite)', () => {
    expect(rankProviders(request, [])).toEqual([])
  })
})
