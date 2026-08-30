import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — modération, équipe, abonnements prestataire et
 * remboursement client. Portées iso depuis `server/api/admin/**` (ADR-0017).
 */
describe('Contrat — admin modération & mutations diverses (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '', superToken: '', clientId: '',
    prestaWithSubId: '', prestaNoSubId: '', subId: '',
    testimonialId: '', complaintId: '',
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}` } })
    state.clientId = client.id
    const prestaWith = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `prow${suffix}` } })
    state.prestaWithSubId = prestaWith.id
    const prestaNo = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pron${suffix}` } })
    state.prestaNoSubId = prestaNo.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token

    const sub = await prisma.subscription.create({ data: { userId: prestaWith.id, plan: 'mensuel', status: 'actif', dateDebut: new Date(), dateFin: new Date(Date.now() + 5 * 24 * 3600 * 1000) } })
    state.subId = sub.id
    const testimonial = await prisma.testimonial.create({ data: { name: `Temoin-${suffix}`, role: 'client', message: 'ok', rating: 4 } })
    state.testimonialId = testimonial.id
    const complaint = await prisma.complaint.create({ data: { category: 'autre', subject: `sujet-${suffix}`, message: 'm', contactEmail: `c-${suffix}@test.tg` } })
    state.complaintId = complaint.id
  })

  afterAll(async () => {
    const userIds = [state.superId, state.clientId, state.prestaWithSubId, state.prestaNoSubId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: userIds } } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.testimonial.deleteMany({ where: { id: state.testimonialId } }).catch(() => undefined)
    await prisma.complaint.deleteMany({ where: { id: state.complaintId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Témoignages', () => {
    it('PATCH masque → 200 hidden=true, puis réaffiche', async () => {
      const h = await request(app).patch(`/api/admin/testimonials/${state.testimonialId}`).set(authed(state.superToken)).send({ hidden: true })
      expect(h.status).toBe(200)
      expect(h.body.hidden).toBe(true)
      const s = await request(app).patch(`/api/admin/testimonials/${state.testimonialId}`).set(authed(state.superToken)).send({ hidden: false })
      expect(s.body.hidden).toBe(false)
    })
    it('DELETE inconnu → 404', async () => {
      expect((await request(app).delete('/api/admin/testimonials/nope').set(authed(state.superToken))).status).toBe(404)
    })
  })

  describe('Réclamations', () => {
    it('PATCH statut invalide → 400', async () => {
      expect((await request(app).patch(`/api/admin/complaints/${state.complaintId}`).set(authed(state.superToken)).send({ status: 'zzz' })).status).toBe(400)
    })
    it('PATCH sans modification → 400', async () => {
      expect((await request(app).patch(`/api/admin/complaints/${state.complaintId}`).set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('PATCH resolu → 200, horodatage de traitement', async () => {
      const res = await request(app).patch(`/api/admin/complaints/${state.complaintId}`).set(authed(state.superToken)).send({ status: 'resolu', adminNote: 'traité' })
      expect(res.status).toBe(200)
      expect(res.body.complaint.status).toBe('resolu')
      expect(typeof res.body.complaint.handledAt).toBe('number')
      expect(res.body.complaint.adminNote).toBe('traité')
    })
  })

  describe('Annonces', () => {
    it('titre manquant → 400', async () => {
      expect((await request(app).post('/api/admin/announcements').set(authed(state.superToken)).send({ target: 'user', userId: state.clientId, body: 'x' })).status).toBe(400)
    })
    it('cible invalide → 400', async () => {
      expect((await request(app).post('/api/admin/announcements').set(authed(state.superToken)).send({ target: 'zzz', title: 't', body: 'b' })).status).toBe(400)
    })
    it('cible user → 200, une notification', async () => {
      const res = await request(app).post('/api/admin/announcements').set(authed(state.superToken)).send({ target: 'user', userId: state.clientId, title: 'Salut', body: 'Bienvenue' })
      expect(res.status).toBe(200)
      expect(res.body.sent).toBe(1)
      expect(await prisma.notification.count({ where: { userId: state.clientId, type: 'admin_message' } })).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Équipe — niveau', () => {
    it('niveau invalide → 400', async () => {
      expect((await request(app).post(`/api/admin/team/${state.clientId}/level`).set(authed(state.superToken)).send({ level: 'roi' })).status).toBe(400)
    })
    it('niveau valide → 200', async () => {
      const res = await request(app).post(`/api/admin/team/${state.clientId}/level`).set(authed(state.superToken)).send({ level: 'moderateur' })
      expect(res.status).toBe(200)
      expect(res.body.user.adminLevel).toBe('moderateur')
    })
  })

  describe('Abonnement prestataire', () => {
    it('extend sans abonnement → 404', async () => {
      expect((await request(app).post(`/api/admin/providers/${state.prestaNoSubId}/subscription-extend`).set(authed(state.superToken)).send({ durationDays: 30 })).status).toBe(404)
    })
    it('extend durée invalide → 400', async () => {
      expect((await request(app).post(`/api/admin/providers/${state.prestaWithSubId}/subscription-extend`).set(authed(state.superToken)).send({ durationDays: -1 })).status).toBe(400)
    })
    it('extend → 200, cancel → 200 expire', async () => {
      const e = await request(app).post(`/api/admin/providers/${state.prestaWithSubId}/subscription-extend`).set(authed(state.superToken)).send({ durationDays: 30 })
      expect(e.status).toBe(200)
      expect(e.body.subscription.status).toBe('actif')
      const c = await request(app).post(`/api/admin/providers/${state.prestaWithSubId}/subscription-cancel`).set(authed(state.superToken)).send({})
      expect(c.status).toBe(200)
      expect(c.body.subscription.status).toBe('expire')
    })
  })

  describe('Remboursement client', () => {
    it('montant manquant → 400', async () => {
      expect((await request(app).post(`/api/admin/clients/${state.clientId}/refund`).set(authed(state.superToken)).send({ reason: 'x' })).status).toBe(400)
    })
    it('motif manquant → 400', async () => {
      expect((await request(app).post(`/api/admin/clients/${state.clientId}/refund`).set(authed(state.superToken)).send({ amount: 1000 })).status).toBe(400)
    })
    it('valide → 200, portefeuille crédité', async () => {
      const res = await request(app).post(`/api/admin/clients/${state.clientId}/refund`).set(authed(state.superToken)).send({ amount: 1500, reason: 'geste commercial' })
      expect(res.status).toBe(200)
      const movements = await prisma.walletMovement.findMany({ where: { walletUserId: state.clientId, type: 'escrow_refund' } })
      expect(movements.some((m) => m.amount === 1500)).toBe(true)
    })
  })
})
