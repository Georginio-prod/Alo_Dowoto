import { describe, expect, it } from 'vitest'
import { addFavorite, isFavorite, listFavorites, removeFavorite } from '~~/server/utils/favoriteStore'

describe('favoriteStore (#65 favoris)', () => {
  it('ajoute un favori et le retrouve dans la liste', () => {
    const favorite = addFavorite('client-1', 'p01')
    expect(favorite).toMatchObject({ clientId: 'client-1', providerId: 'p01' })
    expect(isFavorite('client-1', 'p01')).toBe(true)
    expect(listFavorites('client-1').map((f) => f.providerId)).toContain('p01')
  })

  it('est idempotent : ajouter deux fois le même favori ne le duplique pas', () => {
    addFavorite('client-2', 'p02')
    const first = listFavorites('client-2')
    addFavorite('client-2', 'p02')
    const second = listFavorites('client-2')
    expect(second).toHaveLength(first.length)
    expect(second.filter((f) => f.providerId === 'p02')).toHaveLength(1)
  })

  it('conserve le createdAt d’origine lors d’un second ajout', () => {
    const first = addFavorite('client-3', 'p03')
    const second = addFavorite('client-3', 'p03')
    expect(second.createdAt).toBe(first.createdAt)
  })

  it('retire un favori existant', () => {
    addFavorite('client-4', 'p04')
    removeFavorite('client-4', 'p04')
    expect(isFavorite('client-4', 'p04')).toBe(false)
    expect(listFavorites('client-4')).toEqual([])
  })

  it('retirer un favori absent ne lève pas d’erreur (idempotent)', () => {
    expect(() => removeFavorite('client-5', 'inexistant')).not.toThrow()
    expect(isFavorite('client-5', 'inexistant')).toBe(false)
  })

  it('isole les favoris par client', () => {
    addFavorite('client-6', 'p05')
    addFavorite('client-7', 'p06')
    expect(listFavorites('client-6').map((f) => f.providerId)).toEqual(['p05'])
    expect(listFavorites('client-7').map((f) => f.providerId)).toEqual(['p06'])
  })

  it('retourne une liste vide sans erreur pour un client sans favori (cas limite)', () => {
    expect(listFavorites('client-jamais-vu')).toEqual([])
  })
})
