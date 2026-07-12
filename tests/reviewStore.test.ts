import { describe, expect, it } from 'vitest'
import { getEffectiveRating } from '~~/server/utils/providerDirectory'
import { getAverageRating, hasReviewed, submitReview } from '~~/server/utils/reviewStore'

describe('reviewStore (#61 API backend — avis & notation)', () => {
  it('refuse une seconde notation du même auteur pour la même conversation', () => {
    submitReview('conv-1', 'client-1', 'provider-1', 5, 'Excellent travail')
    expect(hasReviewed('conv-1', 'client-1')).toBe(true)
    expect(() => submitReview('conv-1', 'client-1', 'provider-1', 1)).toThrow()
  })

  it('autorise la notation dans les deux sens sur une même conversation', () => {
    submitReview('conv-2', 'client-2', 'provider-2', 4)
    // Le prestataire note le client sur la même conversation : ce n'est pas
    // le même auteur, donc ce n'est pas une double notation.
    expect(() => submitReview('conv-2', 'provider-2', 'client-2', 5)).not.toThrow()
  })

  it('calcule correctement la moyenne et le nombre d’avis', () => {
    submitReview('conv-3', 'client-3', 'provider-3', 5)
    submitReview('conv-4', 'client-4', 'provider-3', 3)
    submitReview('conv-5', 'client-5', 'provider-3', 4)

    expect(getAverageRating('provider-3')).toEqual({ average: 4, count: 3 })
  })

  it('retourne une moyenne nulle pour un profil sans avis (cas limite)', () => {
    expect(getAverageRating('provider-inconnu')).toEqual({ average: 0, count: 0 })
  })

  it('la moyenne recalculée est immédiatement utilisée par le moteur de scoring', () => {
    // p02 vient de l'annuaire de démo (server/utils/providerDirectory.ts) :
    // sans avis, getEffectiveRating retombe sur sa note figée.
    const before = getEffectiveRating('p02')
    expect(before).toEqual({ rating: 4.6, reviewCount: 18 })

    submitReview('conv-p02-a', 'client-a', 'p02', 5)
    submitReview('conv-p02-b', 'client-b', 'p02', 3)

    // Dès qu'un avis existe, la moyenne recalculée (ici (5+3)/2 = 4)
    // remplace la valeur figée de l'annuaire.
    const after = getEffectiveRating('p02')
    expect(after).toEqual({ rating: 4, reviewCount: 2 })
  })
})
