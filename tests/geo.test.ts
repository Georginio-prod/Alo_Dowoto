import { describe, expect, it } from 'vitest'
import { haversineDistanceKm } from '~~/server/utils/geo'

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
