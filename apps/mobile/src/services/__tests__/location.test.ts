import { distanceKm } from '../location'

describe('distanceKm (Haversine)', () => {
  it('renvoie ~0 pour deux points identiques', () => {
    const p = { latitude: 6.1319, longitude: 1.2228 } // Lomé
    expect(distanceKm(p, p)).toBeCloseTo(0, 5)
  })
  it('calcule une distance connue (Lomé → Kpalimé ≈ 100 km)', () => {
    const lome = { latitude: 6.1319, longitude: 1.2228 }
    const kpalime = { latitude: 6.9, longitude: 0.6299 }
    const d = distanceKm(lome, kpalime)
    expect(d).toBeGreaterThan(90)
    expect(d).toBeLessThan(120)
  })
})
