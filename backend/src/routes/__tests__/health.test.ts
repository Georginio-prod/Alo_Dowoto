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

  it('une route inconnue renvoie 404 au format d’erreur Nitro', async () => {
    const res = await request(app).get('/route-inexistante')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: true, statusCode: 404 })
  })
})
