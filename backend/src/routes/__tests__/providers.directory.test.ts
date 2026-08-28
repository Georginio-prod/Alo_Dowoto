import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createServer } from '../../config/server'

/**
 * Contrat de la découverte publique de prestataires (#43/#66/#187) portée vers
 * Express (Phase 2, ADR-0016) : recherche filtrée + proximité, mise en avant,
 * comptage par secteur. Routes PUBLIQUES (aucune session). L'annuaire de
 * démonstration est actif en test (NODE_ENV=test), ce qui garantit des résultats.
 */
describe('Contrat — annuaire public (/api/providers, /api/sectors)', () => {
  const app = createServer()

  describe('GET /providers/search', () => {
    it('sans filtre → résultats paginés', async () => {
      const res = await request(app).get('/api/providers/search')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.results)).toBe(true)
      expect(res.body.results.length).toBeGreaterThan(0)
      expect(res.body).toMatchObject({ page: 1, pageSize: 12, proximity: null })
      expect(typeof res.body.total).toBe('number')
    })

    it('filtre secteur → uniquement ce secteur', async () => {
      const res = await request(app).get('/api/providers/search?secteur=menage')
      expect(res.status).toBe(200)
      expect(res.body.results.every((p: { sector: string }) => p.sector === 'menage')).toBe(true)
    })

    it('secteur invalide → 400', async () => {
      expect((await request(app).get('/api/providers/search?secteur=nexistepas')).status).toBe(400)
    })

    it('coordonnées → bloc proximity présent', async () => {
      const res = await request(app).get('/api/providers/search?lat=6.13&lng=1.22&rayon_km=10')
      expect(res.status).toBe(200)
      expect(res.body.proximity).toMatchObject({ requestedRadiusKm: 10, usedRadiusKm: expect.any(Number), widened: expect.any(Boolean) })
    })

    it('pageSize borné à 50', async () => {
      const res = await request(app).get('/api/providers/search?pageSize=999')
      expect(res.body.pageSize).toBe(50)
    })
  })

  describe('GET /providers/featured', () => {
    it('classement avec badges (premier = top)', async () => {
      const res = await request(app).get('/api/providers/featured?limit=5')
      expect(res.status).toBe(200)
      expect(res.body.results.length).toBeGreaterThan(0)
      expect(res.body.results.length).toBeLessThanOrEqual(5)
      expect(res.body.results[0].badge).toBe('top')
      expect(res.body.results.slice(1).every((p: { badge: string }) => p.badge === 'recommande')).toBe(true)
    })

    it('secteur invalide → 400', async () => {
      expect((await request(app).get('/api/providers/featured?secteur=nope')).status).toBe(400)
    })
  })

  describe('GET /sectors/counts', () => {
    it('compte par secteur (menage peuplé par la démo)', async () => {
      const res = await request(app).get('/api/sectors/counts')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const menage = res.body.find((s: { slug: string }) => s.slug === 'menage')
      expect(menage.count).toBeGreaterThan(0)
    })
  })
})
