import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « notations reçues » porté vers Express (Phase 2, ADR-0016) :
 * réservé à un utilisateur connecté (401 sinon), `{ rating: { average, count } }`
 * — 0/0 sans avis, moyenne exacte sinon. Base de test ISOLÉE, comptes uniques.
 */
describe('Contrat — notations reçues (/api/reviews/me)', () => {
  const app = createServer()
  const state = { userId: '', token: '' }

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `u${randomUUID().slice(0, 8)}` } })
    state.userId = u.id
    state.token = randomUUID()
    await prisma.session.create({ data: { token: state.token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  })

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { targetId: state.userId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: state.userId } }).catch(() => undefined)
  })

  const cookie = () => `wt_session=${state.token}`

  it('GET sans session → 401', async () => {
    const res = await request(app).get('/api/reviews/me')
    expect(res.status).toBe(401)
  })

  it('GET sans aucun avis → { average: 0, count: 0 }', async () => {
    const res = await request(app).get('/api/reviews/me').set('Cookie', cookie())
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ rating: { average: 0, count: 0 } })
  })

  it('GET → moyenne et nombre exacts après notation', async () => {
    await prisma.review.create({ data: { conversationId: `c-${randomUUID()}`, authorId: `a-${randomUUID()}`, targetId: state.userId, rating: 4 } })
    await prisma.review.create({ data: { conversationId: `c-${randomUUID()}`, authorId: `a-${randomUUID()}`, targetId: state.userId, rating: 5 } })

    const res = await request(app).get('/api/reviews/me').set('Cookie', cookie())
    expect(res.status).toBe(200)
    expect(res.body.rating).toEqual({ average: 4.5, count: 2 })
  })
})
