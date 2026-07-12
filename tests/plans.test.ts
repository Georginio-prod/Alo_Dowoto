import { describe, expect, it } from 'vitest'
import { findPlan, PLANS } from '~/data/plans'

describe('findPlan (#29 sélection de formule d’abonnement)', () => {
  it('retrouve chacune des formules par son slug', () => {
    for (const plan of PLANS) {
      expect(findPlan(plan.slug)?.slug).toBe(plan.slug)
    }
  })

  it('retourne undefined pour un slug inconnu (cas limite)', () => {
    expect(findPlan('inexistant')).toBeUndefined()
  })

  it('retourne undefined pour une chaîne vide', () => {
    expect(findPlan('')).toBeUndefined()
  })
})
