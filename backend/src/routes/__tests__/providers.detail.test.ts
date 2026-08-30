import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createServer } from '../../config/server'

/**
 * Contrat de la fiche prestataire détaillée `GET /api/providers/:id` (#127),
 * portée iso depuis `server/api/providers/[id].get.ts` (ADR-0016). Route
 * publique : sans commande validée, les coordonnées restent masquées (#264).
 * S'appuie sur l'annuaire de démonstration (`p01`), donc aucun compte à créer.
 */
describe('Contrat — fiche prestataire (/api/providers/:id)', () => {
  const app = createServer()

  it('GET /providers/p01 (visiteur anonyme) → 200, coordonnées masquées', async () => {
    const res = await request(app).get('/api/providers/p01')
    expect(res.status).toBe(200)
    expect(res.body.provider.id).toBe('p01')
    expect(res.body.provider.contactRevealed).toBe(false)
    // Masquage anti-fuite (#264) : le téléphone/e-mail contient des puces.
    expect(res.body.provider.phone).toContain('•')
    expect(res.body.provider.email).toContain('•')
  })

  it('GET /providers/inconnu → 404', async () => {
    const res = await request(app).get('/api/providers/nexiste-pas')
    expect(res.status).toBe(404)
  })

  it('GET /providers/search reste routé (non capturé par :id)', async () => {
    const res = await request(app).get('/api/providers/search')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.results)).toBe(true)
  })
})
