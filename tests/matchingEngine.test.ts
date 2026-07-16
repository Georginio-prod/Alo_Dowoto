import { describe, expect, it } from 'vitest'
import {
  bayesianRating,
  DEFAULT_FEATURED_WEIGHTS,
  DEFAULT_MATCH_WEIGHTS,
  rankFeaturedProviders,
  rankProviders,
  scoreFeaturedProvider,
  scoreProvider,
  type FeaturedCandidate,
  type MatchCandidate,
  type MatchRequest,
} from '~~/server/utils/matchingEngine'

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

describe('bayesianRating (#187 mise en avant des meilleurs prestataires)', () => {
  it('ramène la note d’un prestataire à un seul avis vers la moyenne de référence', () => {
    const oneReview = bayesianRating(5, 1)
    expect(oneReview).toBeLessThan(5)
    expect(oneReview).toBeGreaterThan(3.5)
  })

  it('se rapproche de la moyenne brute quand le nombre d’avis est élevé', () => {
    const manyReviews = bayesianRating(4.5, 200)
    expect(manyReviews).toBeCloseTo(4.5, 1)
  })

  it('retombe sur la moyenne de référence sans aucun avis (cas limite)', () => {
    expect(bayesianRating(0, 0)).toBe(3.5)
  })

  it('un prestataire avec beaucoup d’avis solides passe devant un 5★ isolé', () => {
    const establishedProvider = bayesianRating(4.6, 50)
    const singleFiveStar = bayesianRating(5, 1)
    expect(establishedProvider).toBeGreaterThan(singleFiveStar)
  })
})

function featuredCandidate(overrides: Partial<FeaturedCandidate> = {}): FeaturedCandidate {
  return {
    providerId: 'f1',
    rating: 4.5,
    reviewCount: 30,
    verified: true,
    experienceYears: 3,
    ...overrides,
  }
}

describe('scoreFeaturedProvider (#187)', () => {
  it('les poids par défaut totalisent 100%', () => {
    const sum = Object.values(DEFAULT_FEATURED_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('donne un score élevé à un prestataire noté, vérifié et expérimenté', () => {
    const result = scoreFeaturedProvider(featuredCandidate())
    expect(result.total).toBeGreaterThanOrEqual(80)
  })

  it('donne un score bas à un prestataire non vérifié, peu noté et sans historique', () => {
    const result = scoreFeaturedProvider(featuredCandidate({ rating: 2, reviewCount: 1, verified: false, experienceYears: 1 }))
    expect(result.total).toBeLessThan(50)
  })
})

describe('rankFeaturedProviders (#187)', () => {
  it('classe un prestataire établi avant un prestataire avec un unique avis 5★', () => {
    const candidates = [
      featuredCandidate({ providerId: 'unique-5-star', rating: 5, reviewCount: 1, verified: false, experienceYears: 1 }),
      featuredCandidate({ providerId: 'etabli', rating: 4.6, reviewCount: 50, verified: true, experienceYears: 4 }),
    ]
    const ranked = rankFeaturedProviders(candidates)
    expect(ranked[0]?.providerId).toBe('etabli')
  })

  it('trie par score décroissant et limite au top N', () => {
    const candidates = [
      featuredCandidate({ providerId: 'low', rating: 1, reviewCount: 0, verified: false, experienceYears: 1 }),
      featuredCandidate({ providerId: 'high' }),
      featuredCandidate({ providerId: 'mid', rating: 3, reviewCount: 5 }),
    ]
    const ranked = rankFeaturedProviders(candidates, DEFAULT_FEATURED_WEIGHTS, 2)
    expect(ranked).toHaveLength(2)
    expect(ranked[0]?.providerId).toBe('high')
    expect(ranked[0]?.total).toBeGreaterThanOrEqual(ranked[1]?.total ?? 0)
  })

  it('retourne une liste vide sans erreur quand aucun candidat n’est fourni (cas limite)', () => {
    expect(rankFeaturedProviders([])).toEqual([])
  })
})
