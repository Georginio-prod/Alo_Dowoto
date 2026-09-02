import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du module admin 9 — anti-désintermédiation. Portées iso depuis
 * `server/api/admin/anti-circumvention/**` (ADR-0017) : tableau de bord des
 * signaux, avertissement, restriction de messagerie, marquage faux positif.
 */
describe('Contrat — admin anti-désintermédiation (/api/admin/anti-circumvention)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = { superId: '', superToken: '', prestaId: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const presta = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${suffix}`, firstName: 'Koffi', lastName: 'Test' } })
    state.prestaId = presta.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token

    // Deux tentatives de contournement journalisées → 1 signal, score 40.
    await prisma.contournementAttempt.createMany({
      data: [
        { conversationId: `conv-${suffix}-1`, userId: presta.id, reason: 'phone', excerpt: 'appelle 90000000' },
        { conversationId: `conv-${suffix}-2`, userId: presta.id, reason: 'email', excerpt: 'ecris a x@y.z' },
      ],
    })
  })

  afterAll(async () => {
    const userIds = [state.superId, state.prestaId]
    await prisma.contournementAttempt.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.riskFalsePositive.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Tableau de bord', () => {
    it('sans jeton → 401', async () => {
      expect((await request(app).get('/api/admin/anti-circumvention')).status).toBe(401)
    })
    it('rôle admin → 200, signal et score de risque du prestataire', async () => {
      const res = await request(app).get('/api/admin/anti-circumvention').set(authed(state.superToken))
      expect(res.status).toBe(200)
      const signal = res.body.signals.find((s: { userId: string }) => s.userId === state.prestaId)
      expect(signal.attemptCount).toBe(2)
      const risk = res.body.riskScores.find((r: { userId: string }) => r.userId === state.prestaId)
      expect(risk.score).toBe(40)
      expect(risk.falsePositive).toBe(false)
      expect(res.body.browseWithoutPaySignals).toHaveLength(2)
    })
  })

  describe('Avertissement', () => {
    it('→ 200, notification in-app créée', async () => {
      const res = await request(app).post(`/api/admin/anti-circumvention/${state.prestaId}/warn`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(await prisma.notification.count({ where: { userId: state.prestaId, type: 'admin_message' } })).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Restriction de messagerie', () => {
    it('corps invalide → 400', async () => {
      expect((await request(app).post(`/api/admin/anti-circumvention/${state.prestaId}/restrict-messaging`).set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('restreint puis lève → 200', async () => {
      const on = await request(app).post(`/api/admin/anti-circumvention/${state.prestaId}/restrict-messaging`).set(authed(state.superToken)).send({ restricted: true })
      expect(on.status).toBe(200)
      expect(on.body.user.messagingRestricted).toBe(true)
      const off = await request(app).post(`/api/admin/anti-circumvention/${state.prestaId}/restrict-messaging`).set(authed(state.superToken)).send({ restricted: false })
      expect(off.body.user.messagingRestricted).toBe(false)
    })
  })

  describe('Faux positif', () => {
    it('→ 200, score ramené à 0 et marqué faux positif', async () => {
      const res = await request(app).post(`/api/admin/anti-circumvention/${state.prestaId}/false-positive`).set(authed(state.superToken)).send({ note: 'client de longue date' })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const dash = await request(app).get('/api/admin/anti-circumvention').set(authed(state.superToken))
      const risk = dash.body.riskScores.find((r: { userId: string }) => r.userId === state.prestaId)
      expect(risk.falsePositive).toBe(true)
      expect(risk.score).toBe(0)
    })
  })
})
