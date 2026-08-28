import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import { getEffectiveRating } from '~~/server/utils/providerDirectory'
import { getAverageRating, hasReviewed, submitReview } from '~~/server/utils/reviewStore'

/**
 * reviewStore est désormais **persisté en base** (Prisma) : ses lectures sont
 * `async`. Le test nettoie les avis qu'il crée (base de test partagée entre
 * workers/exécutions).
 */
const CONVERSATIONS = ['conv-1', 'conv-2', 'conv-3', 'conv-4', 'conv-5', 'conv-p02-a', 'conv-p02-b']

describe('reviewStore (#61 API backend — avis & notation)', () => {
  afterAll(async () => {
    await prisma.review.deleteMany({ where: { conversationId: { in: CONVERSATIONS } } }).catch(() => undefined)
  })

  it('refuse une seconde notation du même auteur pour la même conversation', async () => {
    await submitReview('conv-1', 'client-1', 'provider-1', 5, 'Excellent travail')
    expect(await hasReviewed('conv-1', 'client-1')).toBe(true)
    await expect(submitReview('conv-1', 'client-1', 'provider-1', 1)).rejects.toThrow()
  })

  it('autorise la notation dans les deux sens sur une même conversation', async () => {
    await submitReview('conv-2', 'client-2', 'provider-2', 4)
    // Le prestataire note le client sur la même conversation : ce n'est pas
    // le même auteur, donc ce n'est pas une double notation.
    await expect(submitReview('conv-2', 'provider-2', 'client-2', 5)).resolves.toBeDefined()
  })

  it('calcule correctement la moyenne et le nombre d’avis', async () => {
    await submitReview('conv-3', 'client-3', 'provider-3', 5)
    await submitReview('conv-4', 'client-4', 'provider-3', 3)
    await submitReview('conv-5', 'client-5', 'provider-3', 4)

    expect(await getAverageRating('provider-3')).toEqual({ average: 4, count: 3 })
  })

  it('retourne une moyenne nulle pour un profil sans avis (cas limite)', async () => {
    expect(await getAverageRating('provider-inconnu')).toEqual({ average: 0, count: 0 })
  })

  it('la moyenne recalculée est immédiatement utilisée par le moteur de scoring', async () => {
    // p02 vient de l'annuaire de démo (server/utils/providerDirectory.ts) :
    // sans avis, getEffectiveRating retombe sur la note figée fournie par
    // l'appelant (repli — voir providerDirectory.getEffectiveRating).
    const fallback = { rating: 4.6, reviewCount: 18 }
    const before = await getEffectiveRating('p02', fallback)
    expect(before).toEqual({ rating: 4.6, reviewCount: 18 })

    await submitReview('conv-p02-a', 'client-a', 'p02', 5)
    await submitReview('conv-p02-b', 'client-b', 'p02', 3)

    // Dès qu'un avis existe, la moyenne recalculée (ici (5+3)/2 = 4)
    // remplace la valeur de repli.
    const after = await getEffectiveRating('p02', fallback)
    expect(after).toEqual({ rating: 4, reviewCount: 2 })
  })
})
