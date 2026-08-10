import {
  PLANS,
  canTransition,
  escrowLabel,
  estimate,
  findPlan,
  formatFcfa,
  monthlyEquivalent,
} from '../utils'

describe('formatFcfa', () => {
  it('formate avec séparateur de milliers et suffixe FCFA', () => {
    expect(formatFcfa(5000)).toBe('5 000 FCFA')
    expect(formatFcfa(13500)).toBe('13 500 FCFA')
    expect(formatFcfa(48000)).toBe('48 000 FCFA')
    expect(formatFcfa(0)).toBe('0 FCFA')
  })
  it('arrondit et gère le négatif', () => {
    expect(formatFcfa(1234.6)).toBe('1 235 FCFA')
    expect(formatFcfa(-2000)).toBe('-2 000 FCFA')
  })
})

describe('PLANS (parité backend app/data/plans.ts)', () => {
  it('contient les trois formules aux prix exacts', () => {
    expect(findPlan('mensuel')?.price).toBe(5000)
    expect(findPlan('trimestriel')?.price).toBe(13500)
    expect(findPlan('annuel')?.price).toBe(48000)
  })
  it('quotas de demandes/mois : 5 / 20 / illimité', () => {
    expect(findPlan('mensuel')?.requestsPerMonth).toBe(5)
    expect(findPlan('trimestriel')?.requestsPerMonth).toBe(20)
    expect(findPlan('annuel')?.requestsPerMonth).toBeNull()
  })
  it('badge présent sur trimestriel et annuel uniquement', () => {
    expect(PLANS.filter((p) => p.hasTag).map((p) => p.slug)).toEqual(['trimestriel', 'annuel'])
  })
  it('équivalent mensuel décroît avec la durée', () => {
    const m = monthlyEquivalent(findPlan('mensuel')!)
    const a = monthlyEquivalent(findPlan('annuel')!)
    expect(a).toBeLessThan(m)
  })
})

describe('estimate', () => {
  it('majore pour une urgence immédiate et minore pour flexible', () => {
    const immediate = estimate({ budgetMax: 10000, urgency: 'immediate' })
    const flexible = estimate({ budgetMax: 10000, urgency: 'flexible' })
    expect(immediate.high).toBeGreaterThan(flexible.high)
    expect(immediate.low).toBeLessThan(immediate.high)
  })
  it('borne basse à 70% de la haute', () => {
    const e = estimate({ budgetMax: 10000, urgency: 'semaine' })
    expect(e.high).toBe(10000)
    expect(e.low).toBe(7000)
  })
  it('gère un budget nul ou négatif sans planter', () => {
    expect(estimate({ budgetMax: -5, urgency: 'semaine' }).high).toBe(0)
  })
})

describe('escrow', () => {
  it('associe un libellé et une teinte à chaque statut', () => {
    expect(escrowLabel('released').tone).toBe('success')
    expect(escrowLabel('disputed').tone).toBe('danger')
    expect(escrowLabel('awaiting_payment').glyph).toBeTruthy()
  })
  it('respecte la machine à états du séquestre', () => {
    expect(canTransition('awaiting_payment', 'in_escrow')).toBe(true)
    expect(canTransition('in_escrow', 'delivered')).toBe(true)
    expect(canTransition('delivered', 'released')).toBe(true)
    // Transitions interdites
    expect(canTransition('awaiting_payment', 'released')).toBe(false)
    expect(canTransition('released', 'in_escrow')).toBe(false)
    expect(canTransition('refunded', 'delivered')).toBe(false)
  })
})
