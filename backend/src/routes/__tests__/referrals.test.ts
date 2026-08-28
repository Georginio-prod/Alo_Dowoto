import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « parrainage » porté vers Express (Phase 2, ADR-0016) :
 * réservé à un utilisateur connecté (401 sinon), code créé à la volée puis
 * stable, bonus, tableau de suivi avec nom du filleul. Base de test ISOLÉE.
 */
describe('Contrat — parrainage (/api/referrals/me)', () => {
  const app = createServer()
  const state = { userId: '', token: '', referredId: '' }

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `u${randomUUID().slice(0, 8)}` } })
    state.userId = u.id
    state.token = randomUUID()
    await prisma.session.create({ data: { token: state.token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const referred = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `r${randomUUID().slice(0, 8)}`, firstName: 'Kofi', lastName: 'Mensah' } })
    state.referredId = referred.id
    await prisma.referral.create({ data: { referrerId: u.id, referredId: referred.id, status: 'pending' } })
  })

  afterAll(async () => {
    await prisma.referral.deleteMany({ where: { referrerId: state.userId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: [state.userId, state.referredId] } } }).catch(() => undefined)
  })

  const cookie = () => `wt_session=${state.token}`

  it('GET sans session → 401', async () => {
    const res = await request(app).get('/api/referrals/me')
    expect(res.status).toBe(401)
  })

  it('GET → code (6 caractères), bonus 500, filleul avec son nom', async () => {
    const res = await request(app).get('/api/referrals/me').set('Cookie', cookie())
    expect(res.status).toBe(200)
    expect(res.body.referralCode).toMatch(/^[A-Z0-9]{6}$/)
    expect(res.body.bonusAmount).toBe(500)
    expect(res.body.referrals).toHaveLength(1)
    expect(res.body.referrals[0]).toMatchObject({ status: 'pending', referredName: 'Kofi Mensah', rewardedAt: null })
  })

  it('GET renvoie le même code au 2e appel (stable)', async () => {
    const a = await request(app).get('/api/referrals/me').set('Cookie', cookie())
    const b = await request(app).get('/api/referrals/me').set('Cookie', cookie())
    expect(b.body.referralCode).toBe(a.body.referralCode)
  })
})
