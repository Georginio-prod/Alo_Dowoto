import { describe, expect, it } from 'vitest'
import { createServiceRequestSchema, isValidCoordinatePair } from '~~/server/utils/apiValidation'

/** Corps valide de référence, cloné et altéré dans chaque cas. */
function validBody() {
  return {
    title: '  Réparer une fuite  ',
    skills: [' plomberie ', '', '  '],
    description: '  fuite sous l’évier  ',
    budgetMax: 15000,
    urgency: 'immediate',
    location: '  Lomé  ',
    sector: 'plomberie',
  }
}

/** Retourne le premier message d'erreur d'un parse échoué (ou null si succès). */
function firstError(input: unknown): string | null {
  const result = createServiceRequestSchema.safeParse(input)
  return result.success ? null : (result.error.issues[0]?.message ?? '')
}

describe('createServiceRequestSchema (#43, validation POST /api/requests)', () => {
  it('accepte un corps valide et normalise (trim + filtre des compétences)', () => {
    const result = createServiceRequestSchema.safeParse(validBody())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Réparer une fuite')
      expect(result.data.skills).toEqual(['plomberie'])
      expect(result.data.description).toBe('fuite sous l’évier')
      expect(result.data.location).toBe('Lomé')
    }
  })

  it('rejette un titre absent ou vide après trim', () => {
    expect(firstError({ ...validBody(), title: '   ' })).toBe('Le titre de la demande est requis.')
    const { title: _title, ...withoutTitle } = validBody()
    expect(firstError(withoutTitle)).toBe('Le titre de la demande est requis.')
  })

  it('rejette une liste de compétences vide (ou uniquement des blancs)', () => {
    expect(firstError({ ...validBody(), skills: ['   ', ''] })).toBe('Indiquez au moins une compétence recherchée.')
    const { skills: _skills, ...withoutSkills } = validBody()
    expect(firstError(withoutSkills)).toBe('Indiquez au moins une compétence recherchée.')
  })

  it('rejette un budget non numérique, nul ou négatif', () => {
    expect(firstError({ ...validBody(), budgetMax: 0 })).toBe('Budget maximum invalide.')
    expect(firstError({ ...validBody(), budgetMax: -5 })).toBe('Budget maximum invalide.')
    expect(firstError({ ...validBody(), budgetMax: 'beaucoup' })).toBe('Budget maximum invalide.')
  })

  it('rejette une urgence hors des valeurs autorisées', () => {
    expect(firstError({ ...validBody(), urgency: 'urgentissime' })).toBe('Urgence invalide.')
  })

  it('rejette une localisation vide', () => {
    expect(firstError({ ...validBody(), location: '  ' })).toBe('La localisation est requise.')
  })

  it('description et secteur sont optionnels (description vide par défaut)', () => {
    const { description: _d, sector: _s, ...minimal } = validBody()
    const result = createServiceRequestSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.sector).toBeUndefined()
    }
  })
})

describe('isValidCoordinatePair (géolocalisation optionnelle à l\'inscription, POST /api/auth/session)', () => {
  it('accepte une paire de nombres dans les plages GPS valides', () => {
    expect(isValidCoordinatePair(6.1319, 1.2228)).toBe(true)
    expect(isValidCoordinatePair(-90, -180)).toBe(true)
    expect(isValidCoordinatePair(90, 180)).toBe(true)
    expect(isValidCoordinatePair(0, 0)).toBe(true)
  })

  it('rejette les valeurs hors plage, non numériques, absentes ou NaN', () => {
    expect(isValidCoordinatePair(91, 1.2228)).toBe(false)
    expect(isValidCoordinatePair(6.1319, 181)).toBe(false)
    expect(isValidCoordinatePair('6.13', 1.2228)).toBe(false)
    expect(isValidCoordinatePair(undefined, undefined)).toBe(false)
    expect(isValidCoordinatePair(6.1319, undefined)).toBe(false)
    expect(isValidCoordinatePair(Number.NaN, 1.2228)).toBe(false)
  })
})
