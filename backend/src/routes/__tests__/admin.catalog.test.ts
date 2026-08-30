import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — catalogue tarifaire & éditorial (formules,
 * coupons, réglages, catégories, questions, contenu). Portées iso depuis
 * `server/api/admin/{plans,coupons,settings,categories,questions,content}/**`
 * (ADR-0017). Toutes réservées au rôle admin.
 */
describe('Contrat — admin catalogue (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = {
    superId: '', superToken: '', clientId: '', clientToken: '',
    planId: '', couponId: '', sectorId: '', questionId: '', contentKey: `home.hero.${suffix}`,
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}` } })
    state.clientId = client.id
    const mk = async (id: string) => { const t = randomUUID(); await prisma.session.create({ data: { token: t, userId: id, expiresAt: new Date(Date.now() + 3_600_000) } }); return t }
    state.superToken = await mk(superAdmin.id)
    state.clientToken = await mk(client.id)
  })

  afterAll(async () => {
    const userIds = [state.superId, state.clientId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.prealableQuestion.deleteMany({ where: { sectorId: state.sectorId } }).catch(() => undefined)
    await prisma.sector.deleteMany({ where: { id: state.sectorId } }).catch(() => undefined)
    await prisma.subscriptionPlanConfig.deleteMany({ where: { id: state.planId } }).catch(() => undefined)
    await prisma.coupon.deleteMany({ where: { id: state.couponId } }).catch(() => undefined)
    await prisma.siteContent.deleteMany({ where: { key: state.contentKey } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Formules', () => {
    it('compte client → 403', async () => {
      expect((await request(app).get('/api/admin/plans').set(authed(state.clientToken))).status).toBe(403)
    })
    it('création sans slug → 400', async () => {
      expect((await request(app).post('/api/admin/plans').set(authed(state.superToken)).send({ name: 'X', priceAmount: 5000, durationDays: 30, commissionRate: 0.1, features: '' })).status).toBe(400)
    })
    it('création → 200, puis patch et toggle', async () => {
      const c = await request(app).post('/api/admin/plans').set(authed(state.superToken)).send({ slug: `plan-${suffix}`, name: 'Pro', priceAmount: 5000, durationDays: 30, commissionRate: 0.1, features: 'a\nb' })
      expect(c.status).toBe(200)
      state.planId = c.body.plan.id
      const p = await request(app).patch(`/api/admin/plans/${state.planId}`).set(authed(state.superToken)).send({ priceAmount: 6000 })
      expect(p.status).toBe(200)
      expect(p.body.plan.priceAmount).toBe(6000)
      const t = await request(app).post(`/api/admin/plans/${state.planId}/toggle`).set(authed(state.superToken)).send({ active: false })
      expect(t.body.plan.active).toBe(false)
    })
  })

  describe('Coupons', () => {
    it('création → 200 (code en majuscules), toggle, liste', async () => {
      const c = await request(app).post('/api/admin/coupons').set(authed(state.superToken)).send({ code: `promo-${suffix}`, discountType: 'percent', discountValue: 10 })
      expect(c.status).toBe(200)
      expect(c.body.coupon.code).toBe(`PROMO-${suffix}`.toUpperCase())
      state.couponId = c.body.coupon.id
      const t = await request(app).post(`/api/admin/coupons/${state.couponId}/toggle`).set(authed(state.superToken)).send({ active: false })
      expect(t.body.coupon.active).toBe(false)
      const list = await request(app).get('/api/admin/coupons').set(authed(state.superToken))
      expect(list.body.coupons.some((x: { id: string }) => x.id === state.couponId)).toBe(true)
    })
  })

  describe('Réglages', () => {
    it('get → 200, patch geoRadiusKm → reflété', async () => {
      const g = await request(app).get('/api/admin/settings').set(authed(state.superToken))
      expect(g.status).toBe(200)
      expect(typeof g.body.settings.commissionRate).toBe('number')
      const p = await request(app).patch('/api/admin/settings').set(authed(state.superToken)).send({ geoRadiusKm: 25 })
      expect(p.status).toBe(200)
      expect(p.body.settings.geoRadiusKm).toBe(25)
    })
  })

  describe('Catégories, questions & contenu', () => {
    it('création catégorie → 200, patch, liste', async () => {
      const c = await request(app).post('/api/admin/categories').set(authed(state.superToken)).send({ slug: `cat-${suffix}`, name: 'Test Cat' })
      expect(c.status).toBe(200)
      state.sectorId = c.body.sector.id
      const p = await request(app).patch(`/api/admin/categories/${state.sectorId}`).set(authed(state.superToken)).send({ name: 'Renommée', active: false })
      expect(p.status).toBe(200)
      const list = await request(app).get('/api/admin/categories').set(authed(state.superToken))
      expect(list.body.sectors.some((s: { id: string }) => s.id === state.sectorId)).toBe(true)
    })

    it('question : création → liste → suppression', async () => {
      const c = await request(app).post(`/api/admin/categories/${state.sectorId}/questions`).set(authed(state.superToken)).send({ label: 'Surface ?' })
      expect(c.status).toBe(200)
      state.questionId = c.body.question.id
      const l = await request(app).get(`/api/admin/categories/${state.sectorId}/questions`).set(authed(state.superToken))
      expect(l.body.questions.some((q: { id: string }) => q.id === state.questionId)).toBe(true)
      const d = await request(app).delete(`/api/admin/questions/${state.questionId}`).set(authed(state.superToken))
      expect(d.status).toBe(200)
      const l2 = await request(app).get(`/api/admin/categories/${state.sectorId}/questions`).set(authed(state.superToken))
      expect(l2.body.questions.some((q: { id: string }) => q.id === state.questionId)).toBe(false)
    })

    it('contenu : upsert (create puis update)', async () => {
      const c = await request(app).post('/api/admin/content').set(authed(state.superToken)).send({ key: state.contentKey, label: 'Héro', value: 'Bienvenue' })
      expect(c.status).toBe(200)
      expect(c.body.content.value).toBe('Bienvenue')
      const u = await request(app).post('/api/admin/content').set(authed(state.superToken)).send({ key: state.contentKey, label: 'Héro', value: 'Bienvenue à tous' })
      expect(u.body.content.value).toBe('Bienvenue à tous')
      const list = await request(app).get('/api/admin/content').set(authed(state.superToken))
      expect(list.body.content.some((x: { key: string }) => x.key === state.contentKey)).toBe(true)
    })
  })
})
