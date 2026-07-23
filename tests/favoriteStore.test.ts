import { describe, expect, it } from 'vitest'
import { addFavorite, isFavorite, listFavorites, removeFavorite } from '~~/server/utils/favoriteStore'

describe('favoriteStore (#65 favoris, persistance #357)', () => {
  it('ajoute un favori et le retrouve dans la liste', async () => {
    const favorite = await addFavorite('client-1', 'p01')
    expect(favorite).toMatchObject({ clientId: 'client-1', providerId: 'p01' })
    expect(await isFavorite('client-1', 'p01')).toBe(true)
    expect((await listFavorites('client-1')).map((f) => f.providerId)).toContain('p01')
  })

  it('est idempotent : ajouter deux fois le même favori ne le duplique pas', async () => {
    await addFavorite('client-2', 'p02')
    const first = await listFavorites('client-2')
    await addFavorite('client-2', 'p02')
    const second = await listFavorites('client-2')
    expect(second).toHaveLength(first.length)
    expect(second.filter((f) => f.providerId === 'p02')).toHaveLength(1)
  })

  it('conserve le createdAt d’origine lors d’un second ajout', async () => {
    const first = await addFavorite('client-3', 'p03')
    const second = await addFavorite('client-3', 'p03')
    expect(second.createdAt).toBe(first.createdAt)
  })

  it('retire un favori existant', async () => {
    await addFavorite('client-4', 'p04')
    await removeFavorite('client-4', 'p04')
    expect(await isFavorite('client-4', 'p04')).toBe(false)
    expect(await listFavorites('client-4')).toEqual([])
  })

  it('retirer un favori absent ne lève pas d’erreur (idempotent)', async () => {
    await expect(removeFavorite('client-5', 'inexistant')).resolves.toBeUndefined()
    expect(await isFavorite('client-5', 'inexistant')).toBe(false)
  })

  it('isole les favoris par client', async () => {
    await addFavorite('client-6', 'p05')
    await addFavorite('client-7', 'p06')
    expect((await listFavorites('client-6')).map((f) => f.providerId)).toEqual(['p05'])
    expect((await listFavorites('client-7')).map((f) => f.providerId)).toEqual(['p06'])
  })

  it('retourne une liste vide sans erreur pour un client sans favori (cas limite)', async () => {
    expect(await listFavorites('client-jamais-vu')).toEqual([])
  })
})
