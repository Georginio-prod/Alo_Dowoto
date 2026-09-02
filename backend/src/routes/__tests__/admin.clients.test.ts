import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du module admin 3 — comptes chercheur. Portées iso depuis
 * `server/api/admin/clients/**` (ADR-0017) : liste paginée filtrable et fiche
 * détaillée (missions, litiges, remboursements, avis déposés).
 */
describe('Contrat — admin chercheurs (/api/admin/clients)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = { superId: '', superToken: '', clientId: '', prestaId: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', status: 'active', username: `cli${suffix}`, firstName: 'Ama', lastName: 'Koffi' } })
    state.clientId = client.id
    const presta = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${suffix}` } })
    state.prestaId = presta.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    const ids = [state.superId, state.clientId, state.prestaId]
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  it('sans jeton → 401', async () => {
    expect((await request(app).get('/api/admin/clients')).status).toBe(401)
  })

  it('liste + filtre q → trouve le chercheur, forme paginée', async () => {
    const res = await request(app).get(`/api/admin/clients?q=cli${suffix}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.page).toBe(1)
    expect(typeof res.body.total).toBe('number')
    const found = res.body.clients.find((c: { id: string }) => c.id === state.clientId)
    expect(found).toBeTruthy()
    expect(found.name).toBe('Ama Koffi')
    expect(found).toHaveProperty('paidMissionsCount')
    expect(found).toHaveProperty('requestsCount')
  })

  it('fiche détaillée → 200 avec sections', async () => {
    const res = await request(app).get(`/api/admin/clients/${state.clientId}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.client.user.id).toBe(state.clientId)
    expect(Array.isArray(res.body.client.missions)).toBe(true)
    expect(Array.isArray(res.body.client.reviewsLeft)).toBe(true)
    expect(Array.isArray(res.body.client.requests)).toBe(true)
  })

  it('fiche sur un prestataire → 404 « Chercheur introuvable. »', async () => {
    const res = await request(app).get(`/api/admin/clients/${state.prestaId}`).set(authed(state.superToken))
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Chercheur introuvable.')
  })
})
