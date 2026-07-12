import { describe, expect, it } from 'vitest'
import { countBySector, searchProviders } from '~~/server/utils/providerDirectory'

describe('searchProviders (#40 filtres de résultats)', () => {
  it('retourne tous les prestataires du secteur quand aucun autre filtre n’est actif', () => {
    const results = searchProviders({ sector: 'menage' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.sector === 'menage')).toBe(true)
  })

  it('combine sous-secteur et ville en ET logique', () => {
    const results = searchProviders({ sector: 'menage', subSectors: ['Ménage à domicile'], city: 'Lomé' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.subSector === 'Ménage à domicile' && p.city === 'Lomé')).toBe(true)
  })

  it('applique le filtre de note minimum', () => {
    const results = searchProviders({ sector: 'menage', ratingMin: 4.8 })
    expect(results.every((p) => p.rating >= 4.8)).toBe(true)
  })

  it('applique le filtre de prix maximum', () => {
    const results = searchProviders({ sector: 'menage', priceMax: 2000 })
    expect(results.every((p) => p.priceFrom <= 2000)).toBe(true)
  })

  it('retourne une liste vide quand aucun prestataire ne correspond (cas limite)', () => {
    const results = searchProviders({ sector: 'menage', subSectors: ['Repassage'], priceMax: 500 })
    expect(results).toEqual([])
  })

  it('filtre par texte libre sur le nom, le sous-secteur ou la ville', () => {
    const results = searchProviders({ query: 'Kpalimé' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((p) => p.city === 'Kpalimé')).toBe(true)
  })
})

describe('countBySector (#66 grille /categories)', () => {
  it('compte les prestataires du secteur, cohérent avec searchProviders', () => {
    expect(countBySector('menage')).toBe(searchProviders({ sector: 'menage' }).length)
    expect(countBySector('menage')).toBeGreaterThan(0)
  })

  it('renvoie 0 pour un secteur sans prestataire dans l’annuaire de démo', () => {
    expect(countBySector('industrie')).toBe(0)
  })
})
