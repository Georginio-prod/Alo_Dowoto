import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du module admin 12 — journal d'audit. Porté iso depuis
 * `server/api/admin/audit-log/index.get.ts` (ADR-0017) : liste paginée et
 * filtrable (type de cible, recherche texte sur l'action/l'acteur).
 */
describe('Contrat — admin journal d\'audit (/api/admin/audit-log)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = { superId: '', superToken: '' }
  const actorLabel = `Audit-${suffix}`

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token

    await prisma.auditLog.createMany({
      data: [
        { actorId: superAdmin.id, actorLabel, action: `user.suspend.${suffix}`, targetType: `compte-${suffix}`, targetId: 'u1', metadata: null },
        { actorId: superAdmin.id, actorLabel, action: `payment.refund.${suffix}`, targetType: `paiement-${suffix}`, targetId: 'p1', metadata: null },
      ],
    })
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: state.superId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.superId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: state.superId } }).catch(() => undefined)
  })

  it('sans jeton → 401', async () => {
    expect((await request(app).get('/api/admin/audit-log')).status).toBe(401)
  })

  it('rôle admin → 200, entrées paginées', async () => {
    const res = await request(app).get('/api/admin/audit-log').set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.entries)).toBe(true)
    expect(res.body.page).toBe(1)
    expect(typeof res.body.total).toBe('number')
    expect(res.body.entries.some((e: { action: string }) => e.action === `user.suspend.${suffix}`)).toBe(true)
  })

  it('filtre targetType → seules les entrées correspondantes', async () => {
    const res = await request(app).get(`/api/admin/audit-log?targetType=paiement-${suffix}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.entries[0].action).toBe(`payment.refund.${suffix}`)
  })

  it('recherche q sur l\'action → filtre', async () => {
    const res = await request(app).get(`/api/admin/audit-log?q=user.suspend.${suffix}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.entries[0].targetType).toBe(`compte-${suffix}`)
  })

  it('pagination pageSize=1 → une seule entrée renvoyée', async () => {
    const res = await request(app).get(`/api/admin/audit-log?q=${suffix}&pageSize=1`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.pageSize).toBe(1)
    expect(res.body.entries).toHaveLength(1)
    expect(res.body.total).toBe(2)
  })
})
