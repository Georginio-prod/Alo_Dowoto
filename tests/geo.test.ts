import { describe, expect, it } from 'vitest'
import { boundingBoxAround, fuzzCoordinate, haversineDistanceKm, isWithinBoundingBox } from '~~/server/utils/geo'

describe('haversineDistanceKm (#263, distance réelle entre deux points GPS)', () => {
  it('renvoie 0 pour deux points identiques', () => {
    const lome = { latitude: 6.1319, longitude: 1.2228 }
    expect(haversineDistanceKm(lome, lome)).toBe(0)
  })

  it('calcule une distance cohérente entre Lomé et Kara (environ 420 km à vol d’oiseau)', () => {
    const lome = { latitude: 6.1319, longitude: 1.2228 }
    const kara = { latitude: 9.5511, longitude: 1.1861 }
    const distance = haversineDistanceKm(lome, kara)
    expect(distance).toBeGreaterThan(370)
    expect(distance).toBeLessThan(420)
  })

  it('est symétrique (A→B == B→A)', () => {
    const a = { latitude: 6.13, longitude: 1.22 }
    const b = { latitude: 6.17, longitude: 1.25 }
    expect(haversineDistanceKm(a, b)).toBe(haversineDistanceKm(b, a))
  })

  it('détecte deux points très proches (quelques centaines de mètres)', () => {
    const a = { latitude: 6.1319, longitude: 1.2228 }
    const b = { latitude: 6.1350, longitude: 1.2228 }
    const distance = haversineDistanceKm(a, b)
    expect(distance).toBeGreaterThan(0)
    expect(distance).toBeLessThan(1)
  })
})

describe('boundingBoxAround / isWithinBoundingBox (#geoloc, pré-filtrage avant Haversine)', () => {
  const lome = { latitude: 6.1319, longitude: 1.2228 }

  it('inclut toujours le centre lui-même', () => {
    const box = boundingBoxAround(lome, 5)
    expect(isWithinBoundingBox(lome, box)).toBe(true)
  })

  it('inclut un point réellement à l’intérieur du rayon (vérifié par Haversine)', () => {
    const nearby = { latitude: 6.15, longitude: 1.23 }
    const box = boundingBoxAround(lome, 5)
    expect(haversineDistanceKm(lome, nearby)).toBeLessThan(5)
    expect(isWithinBoundingBox(nearby, box)).toBe(true)
  })

  it('exclut un point clairement hors du rayon (Kara, ~420 km)', () => {
    const kara = { latitude: 9.5511, longitude: 1.1861 }
    const box = boundingBoxAround(lome, 5)
    expect(isWithinBoundingBox(kara, box)).toBe(false)
  })

  it('élargit le rectangle quand le rayon augmente', () => {
    const small = boundingBoxAround(lome, 5)
    const large = boundingBoxAround(lome, 20)
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat)
  })
})

describe('fuzzCoordinate (#geoloc, position approximative — vie privée par défaut)', () => {
  it('arrondit à ~2 décimales (écart maximal théorique ~0,8 km à cette latitude, jamais plus d’1 km)', () => {
    const exact = { latitude: 6.131923, longitude: 1.222812 }
    const fuzzed = fuzzCoordinate(exact)
    expect(haversineDistanceKm(exact, fuzzed)).toBeLessThan(1)
  })

  it('est déterministe : la même position exacte donne toujours le même flou', () => {
    const exact = { latitude: 6.131923, longitude: 1.222812 }
    expect(fuzzCoordinate(exact)).toEqual(fuzzCoordinate(exact))
  })
})
