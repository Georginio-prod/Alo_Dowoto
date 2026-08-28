import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { signWebhookBody } from '../../utils/webhookSignature'

/**
 * Contrat du portefeuille porté vers Express (Phase 2, ADR-0016) : solde
 * recalculé, recharge (pending), retrait (rôle prestataire, min/solde), et
 * webhook opérateur (signature HMAC + anti-rejeu #355). Base de test ISOLÉE,
 * comptes uniques. Le reçu PDF n'est pas couvert ici (route non portée).
 */
describe('Contrat — portefeuille (/api/wallet)', () => {
  const app = createServer()
  const client = { userId: '', token: '' }
  const provider = { userId: '', token: '' }
  // Compte dédié au crédit par webhook : isolé des confirmations simulées (timer
  // 3s) déclenchées par les recharges créées via POST dans d'autres tests.
  const creditee = { userId: '', token: '' }
  const sectorId = `sec-${randomUUID()}`

  beforeAll(async () => {
    const c = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${randomUUID().slice(0, 8)}` } })
    client.userId = c.id
    client.token = randomUUID()
    await prisma.session.create({ data: { token: client.token, userId: c.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const p = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `p${randomUUID().slice(0, 8)}` } })
    provider.userId = p.id
    provider.token = randomUUID()
    await prisma.session.create({ data: { token: provider.token, userId: p.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const w = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `w${randomUUID().slice(0, 8)}` } })
    creditee.userId = w.id
    creditee.token = randomUUID()
    await prisma.session.create({ data: { token: creditee.token, userId: w.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    // Profil prestataire avec moyen de retrait (requis par POST /wallet/withdraw).
    await prisma.sector.create({ data: { id: sectorId, slug: `slug-${randomUUID().slice(0, 8)}`, name: 'Test', emoji: '🔧', color: '#000', ink: '#fff' } })
    await prisma.providerProfile.create({ data: { userId: p.id, displayName: 'Presta Test', sectorId, payoutMethod: 'flooz' } })
  })

  afterAll(async () => {
    const ids = [client.userId, provider.userId, creditee.userId]
    await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: ids } } }).catch(() => undefined)
    await prisma.walletRecharge.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.webhookNonce.deleteMany({ where: { nonce: { startsWith: 'test-' } } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: provider.userId } }).catch(() => undefined)
    await prisma.sector.deleteMany({ where: { id: sectorId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  const clientCookie = () => `wt_session=${client.token}`
  const providerCookie = () => `wt_session=${provider.token}`
  const crediteeCookie = () => `wt_session=${creditee.token}`

  // Envoie un webhook signé (corps brut exact utilisé pour la signature).
  const sendWebhook = (bodyObj: unknown, signature?: string) => {
    const raw = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
    return request(app)
      .post('/api/wallet/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-signature', signature ?? signWebhookBody(raw))
      .send(raw)
  }

  describe('GET /wallet/me', () => {
    it('sans session → 401', async () => {
      expect((await request(app).get('/api/wallet/me')).status).toBe(401)
    })
    it('avec session → solde 0, aucun mouvement, minWithdrawal 5000', async () => {
      const res = await request(app).get('/api/wallet/me').set('Cookie', clientCookie())
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ balance: 0, movements: [], minWithdrawal: 5000 })
    })
  })

  describe('POST /wallet/recharge', () => {
    it('sans session → 401', async () => {
      expect((await request(app).post('/api/wallet/recharge').send({ provider: 'flooz', phone: '90000000', amount: 1000 })).status).toBe(401)
    })
    it.each([
      { provider: 'orange', phone: '90000000', amount: 1000 },
      { provider: 'flooz', phone: '90000000', amount: 100 },
      { provider: 'flooz', phone: '   ', amount: 1000 },
    ])('corps invalide → 400 : %o', async (body) => {
      const res = await request(app).post('/api/wallet/recharge').set('Cookie', clientCookie()).send(body)
      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: true, statusCode: 400 })
    })
    it('numéro non normalisable → 400', async () => {
      const res = await request(app).post('/api/wallet/recharge').set('Cookie', clientCookie()).send({ provider: 'flooz', phone: '123', amount: 1000 })
      expect(res.status).toBe(400)
    })
    it('valide → { recharge } en pending', async () => {
      const res = await request(app).post('/api/wallet/recharge').set('Cookie', clientCookie()).send({ provider: 'tmoney', phone: '91234567', amount: 2000 })
      expect(res.status).toBe(200)
      expect(res.body.recharge).toMatchObject({ userId: client.userId, provider: 'tmoney', amount: 2000, status: 'pending' })
    })
  })

  describe('GET /wallet/recharge/:id', () => {
    it('inconnue → 404', async () => {
      expect((await request(app).get(`/api/wallet/recharge/${randomUUID()}`).set('Cookie', clientCookie())).status).toBe(404)
    })
    it("recharge d'un autre compte → 404", async () => {
      const r = await prisma.walletRecharge.create({ data: { userId: provider.userId, provider: 'flooz', phone: '+22890000000', amount: 1000 } })
      expect((await request(app).get(`/api/wallet/recharge/${r.id}`).set('Cookie', clientCookie())).status).toBe(404)
    })
    it('sa propre recharge → 200', async () => {
      const r = await prisma.walletRecharge.create({ data: { userId: client.userId, provider: 'flooz', phone: '+22891234567', amount: 1500 } })
      const res = await request(app).get(`/api/wallet/recharge/${r.id}`).set('Cookie', clientCookie())
      expect(res.status).toBe(200)
      expect(res.body.recharge.id).toBe(r.id)
    })
  })

  describe('POST /wallet/withdraw', () => {
    it('client (mauvais rôle) → 403', async () => {
      expect((await request(app).post('/api/wallet/withdraw').set('Cookie', clientCookie()).send({ amount: 5000 })).status).toBe(403)
    })
    it('prestataire, montant sous le minimum → 400', async () => {
      const res = await request(app).post('/api/wallet/withdraw').set('Cookie', providerCookie()).send({ amount: 1000 })
      expect(res.status).toBe(400)
      expect(res.body.message).toContain('minimum')
    })
    it('prestataire, solde insuffisant → 402', async () => {
      const res = await request(app).post('/api/wallet/withdraw').set('Cookie', providerCookie()).send({ amount: 5000 })
      expect(res.status).toBe(402)
    })
    it('prestataire avec solde suffisant → { movement } et solde débité', async () => {
      // Crédite 10000 (mouvement recharge) puis retire 5000.
      await prisma.walletMovement.create({ data: { walletUserId: provider.userId, type: 'recharge', amount: 10_000, reference: randomUUID() } })
      const res = await request(app).post('/api/wallet/withdraw').set('Cookie', providerCookie()).send({ amount: 5000 })
      expect(res.status).toBe(200)
      expect(res.body.movement).toMatchObject({ walletUserId: provider.userId, type: 'retrait', amount: 5000 })

      const me = await request(app).get('/api/wallet/me').set('Cookie', providerCookie())
      expect(me.body.balance).toBe(5000)
    })
  })

  describe('POST /wallet/webhook', () => {
    const freshBody = (rechargeId: string, extra: Record<string, unknown> = {}) => ({
      rechargeId, status: 'success', timestamp: Date.now(), nonce: `test-${randomUUID()}`, ...extra,
    })

    it('signature invalide → 401', async () => {
      const r = await prisma.walletRecharge.create({ data: { userId: client.userId, provider: 'flooz', phone: '+22890000000', amount: 3000 } })
      expect((await sendWebhook(freshBody(r.id), 'deadbeef')).status).toBe(401)
    })
    it('JSON malformé (signé) → 400 iso', async () => {
      const raw = '{"rechargeId": oops}'
      const res = await sendWebhook(raw)
      expect(res.status).toBe(400)
      expect(res.body.message).toContain('illisible')
    })
    it('recharge inconnue → 404', async () => {
      expect((await sendWebhook(freshBody(randomUUID()))).status).toBe(404)
    })
    it('timestamp périmé → 401', async () => {
      const r = await prisma.walletRecharge.create({ data: { userId: client.userId, provider: 'flooz', phone: '+22890000000', amount: 3000 } })
      expect((await sendWebhook(freshBody(r.id, { timestamp: Date.now() - 10 * 60 * 1000 }))).status).toBe(401)
    })
    it('nonce déjà consommé → 401 (anti-rejeu)', async () => {
      const r = await prisma.walletRecharge.create({ data: { userId: client.userId, provider: 'flooz', phone: '+22890000000', amount: 3000 } })
      const nonce = `test-${randomUUID()}`
      await prisma.webhookNonce.create({ data: { nonce, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } })
      expect((await sendWebhook(freshBody(r.id, { nonce }))).status).toBe(401)
    })
    it('valide → recharge confirmée + portefeuille crédité, puis rejeu idempotent', async () => {
      // Compte `creditee` isolé : son solde n'est touché QUE par ce webhook.
      const r = await prisma.walletRecharge.create({ data: { userId: creditee.userId, provider: 'flooz', phone: '+22890000000', amount: 4000 } })

      const body = freshBody(r.id)
      const res = await sendWebhook(body)
      expect(res.status).toBe(200)
      expect(res.body.recharge).toMatchObject({ id: r.id, status: 'confirmed' })

      const after = (await request(app).get('/api/wallet/me').set('Cookie', crediteeCookie())).body.balance
      expect(after).toBe(4000)

      // Rejeu du même webhook : recharge déjà résolue → renvoyée telle quelle (200), pas recréditée.
      const replay = await sendWebhook(body)
      expect(replay.status).toBe(200)
      expect(replay.body.recharge.status).toBe('confirmed')
      const final = (await request(app).get('/api/wallet/me').set('Cookie', crediteeCookie())).body.balance
      expect(final).toBe(4000)
    })
  })
})
