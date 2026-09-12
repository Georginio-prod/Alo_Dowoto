import { afterEach, describe, expect, it } from 'vitest'
import { env } from '../../config/env'
import { getFaqCategoriesFr } from '../faq'

/**
 * FAQ de l'assistant selon le flag SUBSCRIPTION_ENABLED : tant que le parcours
 * d'abonnement est masqué, la catégorie « Prestataires » ne doit renvoyer vers
 * aucune formule, page Tarification ni paiement d'abonnement.
 */
describe('FAQ assistant — parcours d’abonnement', () => {
  const initial = env.subscriptionEnabled
  afterEach(() => {
    env.subscriptionEnabled = initial
  })

  const providers = () => getFaqCategoriesFr().find((category) => category.id === 'prestataires')

  it('flag actif → FAQ complète (5 questions prestataires, formules mentionnées)', () => {
    env.subscriptionEnabled = true
    const category = providers()
    expect(category?.items).toHaveLength(5)
    expect(category?.items.some((item) => /formule/i.test(item.answer))).toBe(true)
  })

  it('flag désactivé → questions d’abonnement retirées, aucune mention de formule/tarification', () => {
    env.subscriptionEnabled = false
    const category = providers()
    expect(category?.items).toHaveLength(3)
    for (const item of category?.items ?? []) {
      expect(`${item.question} ${item.answer}`).not.toMatch(/formule|tarification|paiement/i)
    }
    // Les autres catégories sont servies telles quelles.
    expect(getFaqCategoriesFr().map((category) => category.id)).toEqual(['chercheurs', 'prestataires', 'compte', 'confidentialite'])
  })
})
