import { describe, expect, it } from 'vitest'
import { searchProviders, searchProvidersNearby } from '~~/server/utils/providerDirectory'
import { upsertProviderProfile } from '~~/server/utils/providerStore'

/**
 * Recherche géolocalisée (#geoloc) : extrait de providerDirectory.test.ts
 * (limite ESLint max-lines) — vie privée par défaut (floutage), filtre par
 * quartier, élargissement automatique du rayon.
 */

describe('searchProviders — position approximative par défaut (#geoloc, vie privée)', () => {
  it('floute les coordonnées d’un prestataire n’ayant pas activé l’affichage précis', () => {
    upsertProviderProfile('real-provider-geo-fuzzed', {
      displayName: 'Position Floutée',
      sector: 'sante',
      latitude: 6.131923,
      longitude: 1.222812,
    })

    const results = searchProviders({ sector: 'sante' })
    const entry = results.find((p) => p.id === 'real-provider-geo-fuzzed')
    expect(entry?.latitude).toBe(6.13)
    expect(entry?.longitude).toBe(1.22)
  })

  it('expose les coordonnées exactes quand le prestataire a explicitement choisi une position précise', () => {
    upsertProviderProfile('real-provider-geo-exact', {
      displayName: 'Position Exacte',
      sector: 'sante',
      latitude: 6.131923,
      longitude: 1.222812,
      positionApproximative: false,
    })

    const results = searchProviders({ sector: 'sante' })
    const entry = results.find((p) => p.id === 'real-provider-geo-exact')
    expect(entry?.latitude).toBe(6.131923)
    expect(entry?.longitude).toBe(1.222812)
  })

  it('expose le quartier renseigné dans les résultats de recherche', () => {
    upsertProviderProfile('real-provider-geo-quartier', { displayName: 'Avec Quartier', sector: 'sante', quartier: 'be' })
    const results = searchProviders({ sector: 'sante' })
    expect(results.find((p) => p.id === 'real-provider-geo-quartier')?.quartier).toBe('be')
  })
})

describe('searchProviders — filtre par quartier (#geoloc)', () => {
  // Secteurs fictifs (n'existent pas dans app/data/sectors.ts) : searchProviders
  // ne valide pas le secteur contre une liste blanche, ce qui permet ici un
  // isolement total vis-à-vis des autres fichiers de test.
  it('exclut un prestataire d’un autre quartier', () => {
    upsertProviderProfile('real-provider-quartier-be', { displayName: 'Bè', sector: 'test-quartier', quartier: 'be' })
    upsertProviderProfile('real-provider-quartier-agoe', { displayName: 'Agoè', sector: 'test-quartier', quartier: 'agoe' })

    const results = searchProviders({ sector: 'test-quartier', quartier: 'be' })
    expect(results.some((p) => p.id === 'real-provider-quartier-be')).toBe(true)
    expect(results.some((p) => p.id === 'real-provider-quartier-agoe')).toBe(false)
  })

  it('n’exclut pas un prestataire sans quartier renseigné quand aucun filtre n’est actif', () => {
    upsertProviderProfile('real-provider-sans-quartier', { displayName: 'Sans Quartier', sector: 'test-quartier-2' })
    const results = searchProviders({ sector: 'test-quartier-2' })
    expect(results.some((p) => p.id === 'real-provider-sans-quartier')).toBe(true)
  })
})

describe('searchProvidersNearby — élargissement automatique (#geoloc, 1.3)', () => {
  it('utilise le rayon demandé par défaut (5 km) quand rien n’est précisé', () => {
    const nearby = searchProvidersNearby({ sector: 'test-nearby-default' }, undefined)
    expect(nearby.requestedRadiusKm).toBe(5)
  })

  it('ne signale aucun élargissement quand des résultats existent déjà au rayon demandé', () => {
    upsertProviderProfile('real-provider-nearby-close', {
      displayName: 'Tout près',
      sector: 'test-nearby-close',
      latitude: 6.135,
      longitude: 1.225,
    })

    const nearby = searchProvidersNearby({ sector: 'test-nearby-close', latitude: 6.1319, longitude: 1.2228 }, 5)
    expect(nearby.widened).toBe(false)
    expect(nearby.usedRadiusKm).toBe(5)
    expect(nearby.results.some((p) => p.id === 'real-provider-nearby-close')).toBe(true)
  })

  it('élargit au palier suivant quand rien n’est trouvé au rayon demandé, et le signale', () => {
    upsertProviderProfile('real-provider-nearby-mid', {
      displayName: 'Un peu plus loin',
      sector: 'test-nearby-mid',
      latitude: 6.22, // ~10 km de Lomé, hors du rayon de 5 km demandé
      longitude: 1.25,
    })

    const nearby = searchProvidersNearby({ sector: 'test-nearby-mid', latitude: 6.1319, longitude: 1.2228 }, 5)
    expect(nearby.widened).toBe(true)
    expect(nearby.usedRadiusKm).toBeGreaterThan(5)
    expect(nearby.results.some((p) => p.id === 'real-provider-nearby-mid')).toBe(true)
  })

  it('renvoie le dernier palier, résultats vides, quand même le plus large ne trouve rien', () => {
    const nearby = searchProvidersNearby({ sector: 'test-nearby-empty', latitude: 6.1319, longitude: 1.2228 }, 5)
    expect(nearby.results).toEqual([])
    expect(nearby.usedRadiusKm).toBe(50)
    expect(nearby.widened).toBe(true)
  })
})
