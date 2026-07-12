import { describe, expect, it } from 'vitest'
import { normalizeContact } from '~~/server/utils/contact'

describe('normalizeContact (#20 validation du formulaire de contact)', () => {
  it('normalise un numéro togolais valide vers +228XXXXXXXX', () => {
    expect(normalizeContact('phone', '90 12 34 56')).toBe('+22890123456')
  })

  it('conserve les 8 derniers chiffres si un indicatif est déjà présent', () => {
    expect(normalizeContact('phone', '+22890123456')).toBe('+22890123456')
  })

  it('rejette un numéro trop court (cas limite)', () => {
    expect(normalizeContact('phone', '9012345')).toBeNull()
  })

  it('rejette une chaîne vide', () => {
    expect(normalizeContact('phone', '')).toBeNull()
  })

  it('accepte un email valide et le met en minuscules', () => {
    expect(normalizeContact('email', 'Vous@Exemple.com')).toBe('vous@exemple.com')
  })

  it('rejette un email invalide (cas limite)', () => {
    expect(normalizeContact('email', 'pas-un-email')).toBeNull()
  })

  it('rejette un email sans domaine', () => {
    expect(normalizeContact('email', 'vous@exemple')).toBeNull()
  })
})
