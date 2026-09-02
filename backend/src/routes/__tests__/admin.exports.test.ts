import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat des exports admin. Portés iso depuis
 * `server/api/admin/{users,payments,escrow,subscriptions}/export.get.ts`
 * (ADR-0017) : JSON `{ items, total }` (CSV côté client), plus le CSV natif des
 * mouvements sur `payments/export?format=csv`.
 */
describe('Contrat — admin exports (/api/admin/**/export)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = { superId: '', superToken: '', userId: '', subId: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const user = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', status: 'active', username: `pro${suffix}`, firstName: 'Exp', lastName: 'Ort' } })
    state.userId = user.id
    const sub = await prisma.subscription.create({ data: { userId: user.id, plan: `plan-${suffix}`, status: 'actif', dateDebut: new Date(), dateFin: new Date(Date.now() + 30 * 24 * 3600 * 1000) } })
    state.subId = sub.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    const ids = [state.superId, state.userId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  it('users/export → 200 { items, total }, contient le compte', async () => {
    const res = await request(app).get(`/api/admin/users/export?search=pro${suffix}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    expect(res.body.items.some((i: { username: string }) => i.username === `pro${suffix}`)).toBe(true)
  })

  it('subscriptions/export → 200, contient l’abonnement', async () => {
    const res = await request(app).get(`/api/admin/subscriptions/export?search=plan-${suffix}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.items.some((i: { plan: string }) => i.plan === `plan-${suffix}`)).toBe(true)
  })

  it('payments/export (JSON) → 200 { items, total }', async () => {
    const res = await request(app).get('/api/admin/payments/export').set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(typeof res.body.total).toBe('number')
  })

  it('payments/export?format=csv → 200 text/csv avec en-tête', async () => {
    const res = await request(app).get('/api/admin/payments/export?format=csv').set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text.split('\n')[0]).toBe('id,kind,amount,status,method,userId,createdAt')
  })

  it('escrow/export → 200 { items, total }', async () => {
    const res = await request(app).get('/api/admin/escrow/export').set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(typeof res.body.total).toBe('number')
  })

  it('sans jeton → 401', async () => {
    expect((await request(app).get('/api/admin/users/export')).status).toBe(401)
  })
})
