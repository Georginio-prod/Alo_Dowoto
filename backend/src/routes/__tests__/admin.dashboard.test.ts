import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 2 — dashboards en LECTURE SEULE, porté iso depuis
 * `server/api/admin/**.get.ts` (ADR-0017). Vérifie le gating (401/403 rôle et
 * permission granulaire) puis la forme des réponses. Base de test ISOLÉE,
 * comptes/données uniques, super-admin (permissions NULL) et admin restreint
 * (permissions ciblées) créés directement en base.
 */
describe('Contrat — admin dashboards read-only (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '',
    superToken: '',
    restrictedId: '',
    restrictedToken: '',
    clientId: '',
    clientToken: '',
    subscriptionId: '',
    paymentId: '',
    escrowId: '',
    complaintId: '',
    testimonialId: '',
    rechargeId: '',
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)

    const superAdmin = await prisma.user.create({
      data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'Zorro', lastName: 'Superadmin', location: 'Lomé' },
    })
    state.superId = superAdmin.id

    // Admin restreint : possède users.view mais PAS dashboard.view (teste le gating dans les deux sens).
    const restricted = await prisma.user.create({
      data: { contact: `mod-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: JSON.stringify(['users.view']), username: `mod${suffix}`, firstName: 'Mod', lastName: 'Restreint' },
    })
    state.restrictedId = restricted.id

    const client = await prisma.user.create({
      data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}`, firstName: 'Cli', lastName: 'Ent' },
    })
    state.clientId = client.id

    const mkToken = async (userId: string) => {
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3_600_000) } })
      return token
    }
    state.superToken = await mkToken(superAdmin.id)
    state.restrictedToken = await mkToken(restricted.id)
    state.clientToken = await mkToken(client.id)

    // Données métier minimales (uniques) pour vérifier les formes de liste.
    const sub = await prisma.subscription.create({ data: { userId: client.id, plan: `plan-${suffix}`, status: 'actif' } })
    state.subscriptionId = sub.id
    const payment = await prisma.payment.create({ data: { subscriptionId: sub.id, userId: client.id, provider: 'flooz', phone: `+228${suffix}`, amount: 2500, status: 'confirmed', operatorRef: `ref-${suffix}` } })
    state.paymentId = payment.id
    const escrow = await prisma.escrowOrder.create({ data: { conversationId: `conv-${suffix}`, clientId: client.id, providerId: `prov-${suffix}`, amount: 12000, status: 'disputed', disputeReason: 'test' } })
    state.escrowId = escrow.id
    const complaint = await prisma.complaint.create({ data: { category: 'paiement', subject: `sujet-${suffix}`, message: 'msg', contactEmail: `c-${suffix}@test.tg` } })
    state.complaintId = complaint.id
    const testimonial = await prisma.testimonial.create({ data: { name: `Temoin-${suffix}`, role: 'client', message: 'super', rating: 5 } })
    state.testimonialId = testimonial.id

    // KYC : une soumission du client sans décision → « en attente » dans la cloche.
    await prisma.verification.create({ data: { userId: client.id, idCardImage: 'data:image/png;base64,AAA', passportPhotoImage: 'data:image/png;base64,BBB', submittedAt: new Date() } })
    // Wallet : une recharge confirmée (le portefeuille plateforme partagé n'est
    // volontairement PAS crédité ici — un mouvement de commission fabriqué
    // fausserait les tests escrow qui vérifient le solde plateforme réel).
    const recharge = await prisma.walletRecharge.create({ data: { userId: client.id, provider: 'flooz', phone: `+228${suffix}`, amount: 8000, status: 'confirmed' } })
    state.rechargeId = recharge.id
  })

  afterAll(async () => {
    const userIds = [state.superId, state.restrictedId, state.clientId]
    await prisma.payment.deleteMany({ where: { id: state.paymentId } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { id: state.subscriptionId } }).catch(() => undefined)
    await prisma.escrowOrder.deleteMany({ where: { id: state.escrowId } }).catch(() => undefined)
    await prisma.complaint.deleteMany({ where: { id: state.complaintId } }).catch(() => undefined)
    await prisma.testimonial.deleteMany({ where: { id: state.testimonialId } }).catch(() => undefined)
    await prisma.walletRecharge.deleteMany({ where: { id: state.rechargeId } }).catch(() => undefined)
    await prisma.kycDecision.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.verification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Gating (auth & permissions)', () => {
    it('GET /admin/overview sans jeton → 401', async () => {
      expect((await request(app).get('/api/admin/overview')).status).toBe(401)
    })

    it('GET /admin/badges avec compte client → 403 réservé aux administrateurs', async () => {
      const res = await request(app).get('/api/admin/badges').set(authed(state.clientToken))
      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Réservé aux administrateurs.')
    })

    it('GET /admin/overview admin restreint sans dashboard.view → 403 permission insuffisante', async () => {
      const res = await request(app).get('/api/admin/overview').set(authed(state.restrictedToken))
      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Permission insuffisante pour cette action.')
    })

    it('GET /admin/users admin restreint AVEC users.view → 200', async () => {
      const res = await request(app).get('/api/admin/users').set(authed(state.restrictedToken))
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.items)).toBe(true)
    })
  })

  describe('Vue d’ensemble & compteurs', () => {
    it('GET /admin/overview (super-admin) → 200, superset desktop + web', async () => {
      const res = await request(app).get('/api/admin/overview').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(typeof res.body.users.total).toBe('number')
      expect(res.body.kpis).toHaveProperty('averageRating')
      expect(res.body.funnel).toHaveProperty('searchesEstimated', true)
      expect(Array.isArray(res.body.signups14d)).toBe(true)
      expect(res.body.signups14d).toHaveLength(14)
    })

    it('GET /admin/badges → 200, quatre compteurs', async () => {
      const res = await request(app).get('/api/admin/badges').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        unverified: expect.any(Number),
        disputed: expect.any(Number),
        complaints: expect.any(Number),
        pendingSubs: expect.any(Number),
      })
      expect(res.body.disputed).toBeGreaterThanOrEqual(1)
    })

    it('GET /admin/catalog → 200, secteurs en lecture seule', async () => {
      const res = await request(app).get('/api/admin/catalog').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.editable).toBe(false)
      expect(res.body.sectors.length).toBeGreaterThan(0)
      expect(res.body.totals.sectors).toBe(res.body.sectors.length)
    })

    it('GET /admin/alerts avec compte client → 403', async () => {
      expect((await request(app).get('/api/admin/alerts').set(authed(state.clientToken))).status).toBe(403)
    })

    it('GET /admin/alerts → 200, cloche cohérente (KYC en attente compté)', async () => {
      const res = await request(app).get('/api/admin/alerts').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        disputesOpen: expect.any(Number),
        kycPending: expect.any(Number),
        paymentsBlocked: expect.any(Number),
        total: expect.any(Number),
      })
      expect(res.body.disputesOpen).toBeGreaterThanOrEqual(1)
      expect(res.body.kycPending).toBeGreaterThanOrEqual(1)
      expect(res.body.total).toBe(res.body.disputesOpen + res.body.kycPending + res.body.paymentsBlocked)
    })
  })

  describe('Portefeuille plateforme', () => {
    it('GET /admin/wallet admin restreint sans wallet.view → 403', async () => {
      expect((await request(app).get('/api/admin/wallet').set(authed(state.restrictedToken))).status).toBe(403)
    })

    it('GET /admin/wallet → 200, solde + mouvements + recharges', async () => {
      const res = await request(app).get('/api/admin/wallet').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(typeof res.body.platformBalance).toBe('number')
      expect(Array.isArray(res.body.movements)).toBe(true)
      expect(res.body.totals.confirmedRecharges).toBeGreaterThanOrEqual(1)
      expect(res.body.recharges.some((r: { id: string }) => r.id === state.rechargeId)).toBe(true)
    })
  })

  describe('Recherche globale', () => {
    it('GET /admin/search q trop court → { results: [] }', async () => {
      const res = await request(app).get('/api/admin/search?q=a').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.results).toEqual([])
    })

    it('GET /admin/search par nom → trouve le compte', async () => {
      const res = await request(app).get('/api/admin/search?q=Zorro').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.results.some((r: { id: string }) => r.id === state.superId)).toBe(true)
    })
  })

  describe('Listes paginées', () => {
    it('GET /admin/users → pagination, jamais de passwordHash exposé', async () => {
      const res = await request(app).get('/api/admin/users?pageSize=100').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ page: 1, pageSize: 100 })
      const client = res.body.items.find((i: { id: string }) => i.id === state.clientId)
      expect(client).toBeTruthy()
      expect(client).not.toHaveProperty('passwordHash')
      expect(client.passwordSet).toBe(false)
    })

    it('GET /admin/providers → forme paginée', async () => {
      const res = await request(app).get('/api/admin/providers').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('items')
      expect(res.body).toHaveProperty('pageCount')
    })

    it('GET /admin/payments → pagination + somme des montants', async () => {
      const res = await request(app).get('/api/admin/payments?status=confirmed&pageSize=100').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(typeof res.body.sumAmount).toBe('number')
      const mine = res.body.items.find((i: { id: string }) => i.id === state.paymentId)
      expect(mine).toBeTruthy()
      expect(mine.plan).toBe(`plan-${suffix}`)
    })

    it('GET /admin/escrow?status=disputed → contient la commande litigieuse + somme', async () => {
      const res = await request(app).get('/api/admin/escrow?status=disputed&pageSize=100').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(typeof res.body.sumAmount).toBe('number')
      const mine = res.body.items.find((i: { id: string }) => i.id === state.escrowId)
      expect(mine).toBeTruthy()
      expect(mine.status).toBe('disputed')
      expect(mine.disputeReason).toBe('test')
    })

    it('GET /admin/subscriptions?status=actif → contient l’abonnement', async () => {
      const res = await request(app).get('/api/admin/subscriptions?status=actif&pageSize=100').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.items.some((i: { id: string }) => i.id === state.subscriptionId)).toBe(true)
    })

    it('GET /admin/testimonials → contient le témoignage', async () => {
      const res = await request(app).get(`/api/admin/testimonials?search=Temoin-${suffix}`).set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.items.some((i: { id: string }) => i.id === state.testimonialId)).toBe(true)
    })

    it('GET /admin/complaints → contient la réclamation', async () => {
      const res = await request(app).get(`/api/admin/complaints?search=sujet-${suffix}`).set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.items.some((i: { id: string }) => i.id === state.complaintId)).toBe(true)
    })
  })
})
