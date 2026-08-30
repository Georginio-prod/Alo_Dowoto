import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — actions MUTANTES sur les comptes, portées iso
 * depuis `server/api/admin/users/[id]/**` + `users/[id].delete` (ADR-0017).
 * Vérifie gating (rôle/permission), garde-fous anti-lockout, invalidation des
 * sessions, marquage à risque, gestion d'abonnement et suppression.
 */
describe('Contrat — admin actions comptes (/api/admin/users)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '', superToken: '', restrictedId: '', restrictedToken: '',
    clientId: '', clientToken: '', prestaId: '', deletableId: '',
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'Sup', lastName: 'A' } })
    state.superId = superAdmin.id
    const restricted = await prisma.user.create({ data: { contact: `mod-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: JSON.stringify(['users.view']), username: `mod${suffix}`, firstName: 'Mod', lastName: 'R' } })
    state.restrictedId = restricted.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}`, firstName: 'Cli', lastName: 'Ent' } })
    state.clientId = client.id
    const presta = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${suffix}` } })
    state.prestaId = presta.id
    const deletable = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `del${suffix}`, firstName: 'A', lastName: 'Supprimer' } })
    state.deletableId = deletable.id

    const mkToken = async (userId: string) => {
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3_600_000) } })
      return token
    }
    state.superToken = await mkToken(superAdmin.id)
    state.restrictedToken = await mkToken(restricted.id)
    state.clientToken = await mkToken(client.id)
  })

  afterAll(async () => {
    const userIds = [state.superId, state.restrictedId, state.clientId, state.prestaId, state.deletableId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Suspension / réactivation', () => {
    it('compte client (rôle) → 403', async () => {
      expect((await request(app).post(`/api/admin/users/${state.clientId}/suspend`).set(authed(state.clientToken)).send({})).status).toBe(403)
    })

    it('admin restreint sans users.suspend → 403', async () => {
      expect((await request(app).post(`/api/admin/users/${state.clientId}/suspend`).set(authed(state.restrictedToken)).send({})).status).toBe(403)
    })

    it('suspendre son propre compte → 400', async () => {
      const res = await request(app).post(`/api/admin/users/${state.superId}/suspend`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Vous ne pouvez pas suspendre votre propre compte.')
    })

    it('suspendre un client → 200 (sessions coupées), puis réactiver via body', async () => {
      const s = await request(app).post(`/api/admin/users/${state.clientId}/suspend`).set(authed(state.superToken)).send({ reason: 'abus' })
      expect(s.status).toBe(200)
      expect(s.body.suspended).toBe(true)
      // Les sessions du compte suspendu sont invalidées.
      expect(await prisma.session.count({ where: { userId: state.clientId } })).toBe(0)

      const r = await request(app).post(`/api/admin/users/${state.clientId}/suspend`).set(authed(state.superToken)).send({ suspended: false })
      expect(r.status).toBe(200)
      expect(r.body.suspended).toBe(false)
    })

    it('route reactivate dédiée → 200', async () => {
      const res = await request(app).post(`/api/admin/users/${state.clientId}/reactivate`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe(state.clientId)
    })
  })

  describe('Mot de passe', () => {
    it('trop court → 400', async () => {
      const res = await request(app).post(`/api/admin/users/${state.clientId}/password`).set(authed(state.superToken)).send({ password: 'court' })
      expect(res.status).toBe(400)
    })

    it('cible administrateur → 400', async () => {
      const res = await request(app).post(`/api/admin/users/${state.restrictedId}/password`).set(authed(state.superToken)).send({ password: 'longpass12' })
      expect(res.status).toBe(400)
    })

    it('client → 200, sessions invalidées', async () => {
      await prisma.session.create({ data: { token: randomUUID(), userId: state.clientId, expiresAt: new Date(Date.now() + 3_600_000) } })
      const res = await request(app).post(`/api/admin/users/${state.clientId}/password`).set(authed(state.superToken)).send({ password: 'nouveaupass1' })
      expect(res.status).toBe(200)
      expect(await prisma.session.count({ where: { userId: state.clientId } })).toBe(0)
    })
  })

  describe('Marquage à risque', () => {
    it('corps invalide (riskFlag manquant) → 400', async () => {
      expect((await request(app).post(`/api/admin/users/${state.clientId}/risk-flag`).set(authed(state.superToken)).send({})).status).toBe(400)
    })

    it('marque à risque → 200, riskFlag=true', async () => {
      const res = await request(app).post(`/api/admin/users/${state.clientId}/risk-flag`).set(authed(state.superToken)).send({ riskFlag: true, note: 'signalé' })
      expect(res.status).toBe(200)
      expect(res.body.user.riskFlag).toBe(true)
    })
  })

  describe('Abonnement manuel', () => {
    it('cible client (non prestataire) → 400', async () => {
      const res = await request(app).post(`/api/admin/users/${state.clientId}/subscription`).set(authed(state.superToken)).send({ action: 'grant', plan: 'mensuel' })
      expect(res.status).toBe(400)
    })

    it('grant → 200 actif, extend → 200, cancel → 200 expire', async () => {
      const g = await request(app).post(`/api/admin/users/${state.prestaId}/subscription`).set(authed(state.superToken)).send({ action: 'grant', plan: 'mensuel' })
      expect(g.status).toBe(200)
      expect(g.body.subscription.status).toBe('actif')

      const e = await request(app).post(`/api/admin/users/${state.prestaId}/subscription`).set(authed(state.superToken)).send({ action: 'extend', days: 15 })
      expect(e.status).toBe(200)

      const c = await request(app).post(`/api/admin/users/${state.prestaId}/subscription`).set(authed(state.superToken)).send({ action: 'cancel' })
      expect(c.status).toBe(200)
      expect(c.body.subscription.status).toBe('expire')
    })

    it('action invalide → 400', async () => {
      expect((await request(app).post(`/api/admin/users/${state.prestaId}/subscription`).set(authed(state.superToken)).send({ action: 'zzz' })).status).toBe(400)
    })
  })

  describe('Suppression définitive', () => {
    it('supprimer son propre compte → 400', async () => {
      const res = await request(app).delete(`/api/admin/users/${state.superId}`).set(authed(state.superToken))
      expect(res.status).toBe(400)
    })

    it('supprimer un compte → 200, compte disparu', async () => {
      const res = await request(app).delete(`/api/admin/users/${state.deletableId}`).set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.deleted.id).toBe(state.deletableId)
      expect(await prisma.user.count({ where: { id: state.deletableId } })).toBe(0)
    })
  })
})
