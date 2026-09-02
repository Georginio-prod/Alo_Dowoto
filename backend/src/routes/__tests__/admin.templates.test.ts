import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du module admin 11 — modèles de messages automatiques. Portées iso
 * depuis `server/api/admin/templates/**` (ADR-0017) : liste et upsert par clé.
 */
describe('Contrat — admin modèles de messages (/api/admin/templates)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const key = `tmpl-${suffix}`
  const PASSWORD = 'secret123'
  const state = { superId: '', superToken: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    await prisma.messageTemplate.deleteMany({ where: { key } }).catch(() => undefined)
    await prisma.auditLog.deleteMany({ where: { actorId: state.superId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.superId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: state.superId } }).catch(() => undefined)
  })

  it('GET → 200, liste des modèles', async () => {
    const res = await request(app).get('/api/admin/templates').set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.templates)).toBe(true)
  })

  it('POST clé manquante → 400', async () => {
    expect((await request(app).post('/api/admin/templates').set(authed(state.superToken)).send({ label: 'x', channel: 'in_app', body: 'y' })).status).toBe(400)
  })

  it('POST valide → 200, modèle créé', async () => {
    const res = await request(app).post('/api/admin/templates').set(authed(state.superToken)).send({ key, label: 'Relance', channel: 'in_app', body: 'Bonjour', subject: 'Sujet' })
    expect(res.status).toBe(200)
    expect(res.body.template.key).toBe(key)
    expect(res.body.template.label).toBe('Relance')
    expect(res.body.template.subject).toBe('Sujet')
  })

  it('POST même clé → 200, upsert met à jour le libellé', async () => {
    const res = await request(app).post('/api/admin/templates').set(authed(state.superToken)).send({ key, label: 'Relance v2', channel: 'email', body: 'Rebonjour' })
    expect(res.status).toBe(200)
    expect(res.body.template.label).toBe('Relance v2')
    expect(res.body.template.channel).toBe('email')
    const count = await prisma.messageTemplate.count({ where: { key } })
    expect(count).toBe(1)
  })
})
