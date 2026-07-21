import { describe, expect, it } from 'vitest'
import { maskContact } from '~~/server/utils/contactMask'

describe('maskContact (#264, anti-fuite des coordonnées)', () => {
  it('masque un numéro de téléphone en ne laissant visibles que les 2 premiers et 2 derniers chiffres', () => {
    expect(maskContact('+228 90 12 34 56')).toBe('+22• •• •• •• 56')
  })

  it('masque un e-mail en ne laissant visibles que les 2 premiers caractères et le domaine', () => {
    expect(maskContact('jean.dupont@example.com')).toBe('je•••••••••@example.com')
  })

  it('masque un texte libre trop court pour être un téléphone (moins de 4 chiffres)', () => {
    expect(maskContact('Bp 123')).toBe('Bp••••')
  })

  it('ne renvoie jamais la valeur brute en clair pour un contact plausible', () => {
    const rawPhone = '90123456'
    const rawEmail = 'contact@domaine.tg'
    expect(maskContact(rawPhone)).not.toBe(rawPhone)
    expect(maskContact(rawEmail)).not.toBe(rawEmail)
  })
})
