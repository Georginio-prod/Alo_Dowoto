import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { signWebhookBody } from '../../utils/webhookSignature'

/**
 * Contrat du paiement d'abonnement porté vers Express (Phase 2, ADR-0016) :
 * initiation (rôle prestataire, abonnement en attente), webhook opérateur
 * (signature HMAC + anti-rejeu #355) qui **active l'abonnement** et **récompense
 * le parrainage** à la confirmation. Base de test ISOLÉE. Le reçu PDF n'est pas
 * couvert (route non portée).
 */
describe('Contrat — paiements (/api/payments)', () => {
  const app = createServer()
  const mkUser = (role: 'client' | 'prestataire') => prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role, username: `${role[0]}${randomUUID().slice(0, 8)}` } })
  const session = async (userId: string) => {
    const token = randomUUID()
    await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3_600_000) } })
    return `wt_session=${token}`
  }

  const state: Record<string, string> = {}
  const userIds: string[] = []
  const subIds: string[] = []

  beforeAll(async () => {
    const client = await mkUser('client'); userIds.push(client.id); state.clientCookie = await session(client.id)

    // Prestataire avec abonnement en attente (initiation).
    const p = await mkUser('prestataire'); userIds.push(p.id); state.pId = p.id; state.pCookie = await session(p.id)
    const s1 = await prisma.subscription.create({ data: { userId: p.id, plan: 'mensuel', status: 'en_attente' } }); subIds.push(s1.id); state.subId = s1.id

    // Prestataire avec abonnement déjà actif (409).
    const pa = await mkUser('prestataire'); userIds.push(pa.id); state.paCookie = await session(pa.id)
    const s2 = await prisma.subscription.create({ data: { userId: pa.id, plan: 'mensuel', status: 'actif' } }); subIds.push(s2.id); state.activeSubId = s2.id

    // Prestataire dédié au webhook (confirmation + activation).
    const pw = await mkUser('prestataire'); userIds.push(pw.id); state.pwId = pw.id
    const s3 = await prisma.subscription.create({ data: { userId: pw.id, plan: 'trimestriel', status: 'en_attente' } }); subIds.push(s3.id); state.pwSubId = s3.id
  })

  afterAll(async () => {
    await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: userIds } } }).catch(() => undefined)
    await prisma.payment.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.referral.deleteMany({ where: { referredId: { in: userIds } } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { id: { in: subIds } } }).catch(() => undefined)
    await prisma.webhookNonce.deleteMany({ where: { nonce: { startsWith: 'test-' } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  const webhook = (bodyObj: unknown, signature?: string) => {
    const raw = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
    return request(app).post('/api/payments/webhook').set('Content-Type', 'application/json').set('x-webhook-signature', signature ?? signWebhookBody(raw)).send(raw)
  }
  const freshBody = (paymentId: string, extra: Record<string, unknown> = {}) => ({ paymentId, status: 'success', timestamp: Date.now(), nonce: `test-${randomUUID()}`, ...extra })

  describe('POST /payments/initiate', () => {
    it('sans session → 401', async () => {
      expect((await request(app).post('/api/payments/initiate').send({ provider: 'flooz', phone: '90000000', subscriptionId: state.subId })).status).toBe(401)
    })
    it('client (mauvais rôle) → 403', async () => {
      expect((await request(app).post('/api/payments/initiate').set('Cookie', state.clientCookie).send({ provider: 'flooz', phone: '90000000' })).status).toBe(403)
    })
    it('corps invalide → 400', async () => {
      expect((await request(app).post('/api/payments/initiate').set('Cookie', state.pCookie).send({ provider: 'orange', phone: '90000000' })).status).toBe(400)
    })
    it('numéro non normalisable → 400', async () => {
      expect((await request(app).post('/api/payments/initiate').set('Cookie', state.pCookie).send({ provider: 'flooz', phone: '123', subscriptionId: state.subId })).status).toBe(400)
    })
    it('abonnement inconnu → 404', async () => {
      const res = await request(app).post('/api/payments/initiate').set('Cookie', state.pCookie).send({ provider: 'flooz', phone: '90000000', subscriptionId: randomUUID() })
      expect(res.status).toBe(404)
    })
    it('abonnement déjà actif → 409', async () => {
      const res = await request(app).post('/api/payments/initiate').set('Cookie', state.paCookie).send({ provider: 'flooz', phone: '90000000', subscriptionId: state.activeSubId })
      expect(res.status).toBe(409)
    })
    it('valide → { payment } pending, montant = prix formule (mensuel = 5000)', async () => {
      const res = await request(app).post('/api/payments/initiate').set('Cookie', state.pCookie).send({ provider: 'tmoney', phone: '91234567', subscriptionId: state.subId })
      expect(res.status).toBe(200)
      expect(res.body.payment).toMatchObject({ userId: state.pId, subscriptionId: state.subId, provider: 'tmoney', amount: 5000, status: 'pending' })
    })
  })

  describe('GET /payments/me', () => {
    it('client → 403', async () => {
      expect((await request(app).get('/api/payments/me').set('Cookie', state.clientCookie)).status).toBe(403)
    })
    it('prestataire → { payments, plan }', async () => {
      const res = await request(app).get('/api/payments/me').set('Cookie', state.pCookie)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.payments)).toBe(true)
      expect(res.body.plan).toBe('mensuel')
    })
  })

  describe('GET /payments/:id', () => {
    it('inconnu → 404', async () => {
      expect((await request(app).get(`/api/payments/${randomUUID()}`).set('Cookie', state.pCookie)).status).toBe(404)
    })
    it("paiement d'un autre compte → 404 ; le sien → 200", async () => {
      const pay = await prisma.payment.create({ data: { userId: state.pId, subscriptionId: state.subId, provider: 'flooz', phone: '+22890000000', amount: 5000 } })
      expect((await request(app).get(`/api/payments/${pay.id}`).set('Cookie', state.clientCookie)).status).toBe(404)
      const own = await request(app).get(`/api/payments/${pay.id}`).set('Cookie', state.pCookie)
      expect(own.status).toBe(200)
      expect(own.body.payment.id).toBe(pay.id)
    })
  })

  describe('POST /payments/webhook', () => {
    it('signature invalide → 401', async () => {
      const pay = await prisma.payment.create({ data: { userId: state.pwId, subscriptionId: state.pwSubId, provider: 'flooz', phone: '+22890000000', amount: 13500 } })
      expect((await webhook(freshBody(pay.id), 'deadbeef')).status).toBe(401)
    })
    it('JSON malformé (signé) → 400', async () => {
      const res = await webhook('{"paymentId": oops}')
      expect(res.status).toBe(400)
      expect(res.body.message).toContain('illisible')
    })
    it('paiement inconnu → 404', async () => {
      expect((await webhook(freshBody(randomUUID()))).status).toBe(404)
    })
    it('timestamp périmé → 401', async () => {
      const pay = await prisma.payment.create({ data: { userId: state.pwId, subscriptionId: state.pwSubId, provider: 'flooz', phone: '+22890000000', amount: 13500 } })
      expect((await webhook(freshBody(pay.id, { timestamp: Date.now() - 10 * 60 * 1000 }))).status).toBe(401)
    })
    it('nonce déjà consommé → 401', async () => {
      const pay = await prisma.payment.create({ data: { userId: state.pwId, subscriptionId: state.pwSubId, provider: 'flooz', phone: '+22890000000', amount: 13500 } })
      const nonce = `test-${randomUUID()}`
      await prisma.webhookNonce.create({ data: { nonce, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } })
      expect((await webhook(freshBody(pay.id, { nonce }))).status).toBe(401)
    })
    it('valide → paiement confirmé + abonnement activé, puis rejeu idempotent', async () => {
      const pay = await prisma.payment.create({ data: { userId: state.pwId, subscriptionId: state.pwSubId, provider: 'flooz', phone: '+22890000000', amount: 13500 } })
      const body = freshBody(pay.id)
      const res = await webhook(body)
      expect(res.status).toBe(200)
      expect(res.body.payment).toMatchObject({ id: pay.id, status: 'confirmed' })

      const sub = await prisma.subscription.findUnique({ where: { id: state.pwSubId } })
      expect(sub?.status).toBe('actif')
      expect(sub?.dateFin).not.toBeNull()

      const replay = await webhook(body)
      expect(replay.status).toBe(200)
      expect(replay.body.payment.status).toBe('confirmed')
    })
  })

  describe('parrainage récompensé à la confirmation (#365)', () => {
    it('un paiement confirmé récompense le parrainage en attente du filleul', async () => {
      const referrer = await mkUser('client'); userIds.push(referrer.id)
      const referred = await mkUser('prestataire'); userIds.push(referred.id)
      const sub = await prisma.subscription.create({ data: { userId: referred.id, plan: 'mensuel', status: 'en_attente' } }); subIds.push(sub.id)
      const referral = await prisma.referral.create({ data: { referrerId: referrer.id, referredId: referred.id, status: 'pending' } })
      const pay = await prisma.payment.create({ data: { userId: referred.id, subscriptionId: sub.id, provider: 'flooz', phone: '+22890000000', amount: 5000 } })

      const res = await webhook(freshBody(pay.id))
      expect(res.status).toBe(200)
      expect(res.body.payment.status).toBe('confirmed')

      // Parrainage récompensé + bonus crédité aux deux portefeuilles (500 chacun).
      const updated = await prisma.referral.findUnique({ where: { id: referral.id } })
      expect(updated?.status).toBe('rewarded')
      const bonuses = await prisma.walletMovement.findMany({ where: { type: 'referral_bonus', reference: referral.id } })
      expect(bonuses).toHaveLength(2)
      expect(bonuses.every((m) => m.amount === 500)).toBe(true)
    })
  })
})
