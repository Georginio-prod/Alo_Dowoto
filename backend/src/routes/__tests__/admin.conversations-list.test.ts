import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat de la liste des mises en relation admin. Portée iso depuis
 * `server/api/admin/conversations.get.ts` (ADR-0017) : liste paginée, client
 * (compte réel) et prestataire (annuaire) résolus, recherche sur le client.
 */
describe('Contrat — admin conversations (/api/admin/conversations)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = { superId: '', superToken: '', clientId: '', prestaId: '', convId: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}`, firstName: 'Zoe', lastName: 'Konu' } })
    state.clientId = client.id
    const presta = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${suffix}`, firstName: 'Kodjo', lastName: 'B' } })
    state.prestaId = presta.id
    const conv = await prisma.conversation.create({ data: { clientId: client.id, providerId: presta.id, firstContactDone: true } })
    state.convId = conv.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    const ids = [state.superId, state.clientId, state.prestaId]
    await prisma.conversation.deleteMany({ where: { id: state.convId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  it('sans jeton → 401', async () => {
    expect((await request(app).get('/api/admin/conversations')).status).toBe(401)
  })

  it('recherche sur le client → 200, conversation résolue', async () => {
    const res = await request(app).get(`/api/admin/conversations?search=Konu`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pageCount')
    const item = res.body.items.find((c: { id: string }) => c.id === state.convId)
    expect(item).toBeTruthy()
    expect(item.client.name).toBe('Zoe Konu')
    expect(item.provider.id).toBe(state.prestaId)
    expect(item.provider.isRealAccount).toBe(true)
    expect(item.firstContactDone).toBe(true)
  })
})
