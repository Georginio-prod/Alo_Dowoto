import { describe, expect, it } from 'vitest'
import { DEFAULT_REGION_SLUG, findQuartierBySlug, getRegionBySlug, listQuartiers, REGIONS } from '~~/app/data/regions'

describe('regions (#geoloc, découpage géographique en donnée de configuration)', () => {
  it('expose la Région Maritime avec des bornes cohérentes (sud < nord, ouest < est)', () => {
    const maritime = getRegionBySlug('maritime')
    expect(maritime).toBeDefined()
    if (!maritime) return

    expect(maritime.bounds.south).toBeLessThan(maritime.bounds.north)
    expect(maritime.bounds.west).toBeLessThan(maritime.bounds.east)
  })

  it('place le centre de la région à l’intérieur de ses propres bornes', () => {
    const maritime = getRegionBySlug('maritime')
    expect(maritime).toBeDefined()
    if (!maritime) return

    expect(maritime.center.latitude).toBeGreaterThanOrEqual(maritime.bounds.south)
    expect(maritime.center.latitude).toBeLessThanOrEqual(maritime.bounds.north)
    expect(maritime.center.longitude).toBeGreaterThanOrEqual(maritime.bounds.west)
    expect(maritime.center.longitude).toBeLessThanOrEqual(maritime.bounds.east)
  })

  it('renvoie undefined pour une région inconnue', () => {
    expect(getRegionBySlug('inconnue')).toBeUndefined()
  })

  it('liste tous les quartiers de toutes les préfectures de la région par défaut', () => {
    const quartiers = listQuartiers()
    const maritime = REGIONS.find((region) => region.slug === DEFAULT_REGION_SLUG)
    expect(maritime).toBeDefined()
    if (!maritime) return

    const expectedCount = maritime.prefectures.reduce((total, prefecture) => total + prefecture.quartiers.length, 0)
    expect(quartiers.length).toBe(expectedCount)
    expect(quartiers.some((quartier) => quartier.slug === 'be')).toBe(true)
  })

  it('renvoie une liste vide pour une région sans quartiers renseignés', () => {
    expect(listQuartiers('plateaux')).toEqual([])
  })

  it('retrouve un quartier par son slug', () => {
    expect(findQuartierBySlug('tokoin')?.name).toBe('Tokoin')
  })

  it('renvoie undefined pour un slug de quartier inconnu', () => {
    expect(findQuartierBySlug('quartier-inexistant')).toBeUndefined()
  })

  it('n’a pas de slug de quartier dupliqué au sein d’une même région (cohérence des données)', () => {
    const slugs = listQuartiers().map((quartier) => quartier.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
