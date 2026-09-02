import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat des mutations comptes admin restantes. Portées iso depuis
 * `server/api/admin/users/{[id].patch,[id]/delete.post,[id]/message.post}`
 * (ADR-0017) : édition, suppression par anonymisation, message direct.
 */
describe('Contrat — admin mutations comptes (édition / suppression / message)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = { superId: '', superToken: '', userId: '', adminTargetId: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const user = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}`, firstName: 'Init', lastName: 'Name' } })
    state.userId = user.id
    const otherAdmin = await prisma.user.create({ data: { contact: `adm2-${suffix}@test.tg`, role: 'admin', username: `adm${suffix}` } })
    state.adminTargetId = otherAdmin.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    const ids = [state.superId, state.userId, state.adminTargetId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  describe('PATCH /api/admin/users/:id', () => {
    it('édite prénom/rôle → 200', async () => {
      const res = await request(app).patch(`/api/admin/users/${state.userId}`).set(authed(state.superToken)).send({ firstName: 'Nouveau', role: 'prestataire' })
      expect(res.status).toBe(200)
      expect(res.body.user.firstName).toBe('Nouveau')
      expect(res.body.user.role).toBe('prestataire')
    })
    it('rôle invalide → 400', async () => {
      expect((await request(app).patch(`/api/admin/users/${state.userId}`).set(authed(state.superToken)).send({ role: 'admin' })).status).toBe(400)
    })
    it('aucune modification → 400', async () => {
      expect((await request(app).patch(`/api/admin/users/${state.userId}`).set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('cible admin → 400', async () => {
      expect((await request(app).patch(`/api/admin/users/${state.adminTargetId}`).set(authed(state.superToken)).send({ firstName: 'X' })).status).toBe(400)
    })
  })

  describe('POST /api/admin/users/:id/message', () => {
    it('objet manquant → 400', async () => {
      expect((await request(app).post(`/api/admin/users/${state.userId}/message`).set(authed(state.superToken)).send({ body: 'coucou' })).status).toBe(400)
    })
    it('valide → 200, notification créée', async () => {
      const res = await request(app).post(`/api/admin/users/${state.userId}/message`).set(authed(state.superToken)).send({ subject: 'Info', body: 'Bonjour' })
      expect(res.status).toBe(200)
      expect(await prisma.notification.count({ where: { userId: state.userId, type: 'admin_message', title: 'Info' } })).toBeGreaterThanOrEqual(1)
    })
  })

  describe('POST /api/admin/users/:id/delete', () => {
    it('anonymise le compte → 200', async () => {
      const res = await request(app).post(`/api/admin/users/${state.userId}/delete`).set(authed(state.superToken)).send({ reason: 'demande RGPD' })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      const row = await prisma.user.findUnique({ where: { id: state.userId }, select: { contact: true, lastName: true } })
      expect(row?.contact).toContain('compte-supprime-')
      expect(row?.lastName).toBe('Compte supprimé')
    })
  })
})
