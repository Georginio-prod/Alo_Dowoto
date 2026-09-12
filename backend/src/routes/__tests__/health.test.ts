import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createServer } from '../../config/server'

/**
 * Fume-test du squelette : l'app démarre, la sonde répond, et le 404 est bien
 * au format d'erreur Nitro `{ error: true, statusCode, message }` (ADR-0016).
 */
describe('Squelette backend', () => {
  const app = createServer()

  it('GET /health répond 200 avec un statut ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', service: 'alo-dowoto-backend' })
  })

  it('GET /health/delivery expose les canaux OTP sans secret (aucun provider en test)', async () => {
    const res = await request(app).get('/health/delivery')
    expect(res.status).toBe(200)
    // vitest.config.mts vide les variables provider : les deux canaux sont à null.
    expect(res.body).toEqual({ status: 'ok', email: null, sms: null })
    expect(JSON.stringify(res.body)).not.toMatch(/xkeysib|AC[0-9a-f]{6,}/i)
  })

  it('une route inconnue renvoie 404 au format d’erreur Nitro', async () => {
    const res = await request(app).get('/route-inexistante')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: true, statusCode: 404 })
  })
})
