import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine messagerie/séquestre porté vers Express (Phase 2, ADR-0016).
 * Vérifie le cycle de vie complet d'une commande en séquestre
 * (first-contact → pay → confirm-order → check-in/out → deliver → receive →
 * review), le masquage des messages au prestataire avant paiement (#194), les
 * gardes d'authentification/rôle et l'anti-contournement (#265). Base de test
 * ISOLÉE, comptes uniques, prestataire réel avec tarif fixe configuré.
 */
describe('Contrat — messagerie & séquestre (/api/conversations)', () => {
  const app = createServer()
  const RATE = 3000
  const state = {
    clientId: '',
    clientToken: '',
    providerId: '',
    providerToken: '',
    sectorId: '',
    conversationId: '',
  }

  const clientCookie = () => `wt_session=${state.clientToken}`
  const providerCookie = () => `wt_session=${state.providerToken}`

  beforeAll(async () => {
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${randomUUID().slice(0, 8)}` } })
    const provider = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `p${randomUUID().slice(0, 8)}` } })
    state.clientId = client.id
    state.providerId = provider.id
    state.clientToken = randomUUID()
    state.providerToken = randomUUID()
    await prisma.session.create({ data: { token: state.clientToken, userId: client.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    await prisma.session.create({ data: { token: state.providerToken, userId: provider.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    // Les deux comptes vérifiés (contacter exige un client ET un prestataire vérifiés).
    await prisma.verification.create({ data: { userId: client.id } })
    await prisma.verification.create({ data: { userId: provider.id } })

    // Profil prestataire réel avec tarif fixe. Secteur au slug aléatoire → aucun
    // champ sectoriel additionnel requis au premier contact (#295).
    state.sectorId = randomUUID()
    await prisma.sector.create({ data: { id: state.sectorId, slug: `slug-${randomUUID().slice(0, 8)}`, name: 'Test', emoji: '🔧', color: '#000', ink: '#fff' } })
    await prisma.providerProfile.create({ data: { userId: provider.id, displayName: 'Presta Test', sectorId: state.sectorId, payoutMethod: 'flooz', rateFrom: RATE } })

    // Solde suffisant pour le chercheur (mouvement de recharge confirmé).
    await prisma.walletMovement.create({ data: { walletUserId: client.id, type: 'recharge', amount: 100_000, reference: randomUUID() } })
  })

  afterAll(async () => {
    const ids = [state.clientId, state.providerId, 'worktogo-platform']
    const convWhere = { OR: [{ clientId: state.clientId }, { providerId: state.providerId }] }
    const convs = await prisma.conversation.findMany({ where: convWhere, select: { id: true } }).catch(() => [])
    const convIds = convs.map((c) => c.id)
    await prisma.escrowOrder.deleteMany({ where: { conversationId: { in: convIds } } }).catch(() => undefined)
    await prisma.review.deleteMany({ where: { conversationId: { in: convIds } } }).catch(() => undefined)
    await prisma.contournementAttempt.deleteMany({ where: { conversationId: { in: convIds } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: ids } } }).catch(() => undefined)
    await prisma.conversation.deleteMany({ where: convWhere }).catch(() => undefined)
    await prisma.verification.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: state.providerId } }).catch(() => undefined)
    await prisma.sector.deleteMany({ where: { id: state.sectorId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  describe('Gardes', () => {
    it('POST /conversations sans session → 401', async () => {
      expect((await request(app).post('/api/conversations').send({ providerId: state.providerId })).status).toBe(401)
    })

    it('POST /conversations avec un compte prestataire → 403', async () => {
      const res = await request(app).post('/api/conversations').set('Cookie', providerCookie()).send({ providerId: state.providerId })
      expect(res.status).toBe(403)
    })

    it('GET /conversations sans session → 401', async () => {
      expect((await request(app).get('/api/conversations')).status).toBe(401)
    })
  })

  describe('Cycle de vie complet d’une commande en séquestre', () => {
    it('POST /conversations (client vérifié) → 200 et crée le fil', async () => {
      const res = await request(app).post('/api/conversations').set('Cookie', clientCookie()).send({ providerId: state.providerId })
      expect(res.status).toBe(200)
      expect(res.body.conversation).toBeTruthy()
      state.conversationId = res.body.conversation.id
    })

    it('POST /:id/first-contact → 201, commande awaiting_payment au tarif fixe', async () => {
      const res = await request(app)
        .post(`/api/conversations/${state.conversationId}/first-contact`)
        .set('Cookie', clientCookie())
        .send({ description: 'Besoin d’un service standard.', contact: 'contact@example.com' })
      expect(res.status).toBe(201)
      expect(res.body.order.status).toBe('awaiting_payment')
      expect(res.body.order.amount).toBe(RATE)
    })

    it('GET /:id/messages côté prestataire → messages masqués tant que non payé (#194)', async () => {
      const res = await request(app).get(`/api/conversations/${state.conversationId}/messages`).set('Cookie', providerCookie())
      expect(res.status).toBe(200)
      expect(res.body.awaitingPayment).toBe(true)
      expect(res.body.messages).toEqual([])
    })

    it('POST /:id/pay → 200, commande in_escrow, débit du chercheur', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/pay`).set('Cookie', clientCookie())
      expect(res.status).toBe(200)
      expect(res.body.order.status).toBe('in_escrow')
    })

    it('POST /:id/pay une seconde fois → 409 (déjà payée)', async () => {
      expect((await request(app).post(`/api/conversations/${state.conversationId}/pay`).set('Cookie', clientCookie())).status).toBe(409)
    })

    it('POST /:id/deliver sans check-in/out → 409', async () => {
      expect((await request(app).post(`/api/conversations/${state.conversationId}/deliver`).set('Cookie', providerCookie())).status).toBe(409)
    })

    it('POST /:id/confirm-order (prestataire) → 201', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/confirm-order`).set('Cookie', providerCookie())
      expect(res.status).toBe(201)
    })

    it('POST /:id/check-in puis /check-out (prestataire) → 200', async () => {
      expect((await request(app).post(`/api/conversations/${state.conversationId}/check-in`).set('Cookie', providerCookie()).send({})).status).toBe(200)
      expect((await request(app).post(`/api/conversations/${state.conversationId}/check-out`).set('Cookie', providerCookie()).send({})).status).toBe(200)
    })

    it('POST /:id/deliver (prestataire) → 200, commande delivered', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/deliver`).set('Cookie', providerCookie())
      expect(res.status).toBe(200)
      expect(res.body.order.status).toBe('delivered')
    })

    it('POST /:id/receive (chercheur) → 200, fonds libérés au prestataire net de commission', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/receive`).set('Cookie', clientCookie())
      expect(res.status).toBe(200)
      expect(res.body.order.status).toBe('released')

      const commission = Math.round(RATE * 0.1)
      const release = await prisma.walletMovement.findFirst({ where: { walletUserId: state.providerId, type: 'escrow_release' } })
      expect(release?.amount).toBe(RATE - commission)
      const platform = await prisma.walletMovement.findFirst({ where: { walletUserId: 'worktogo-platform', type: 'commission' } })
      expect(platform?.amount).toBe(commission)
    })

    it('POST /:id/review (chercheur) → 201 une fois la prestation validée', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/review`).set('Cookie', clientCookie()).send({ rating: 5, comment: 'Parfait' })
      expect(res.status).toBe(201)
      expect(res.body.review.rating).toBe(5)
    })

    it('POST /:id/review une seconde fois → 409 (double notation)', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/review`).set('Cookie', clientCookie()).send({ rating: 4 })
      expect(res.status).toBe(409)
    })
  })

  describe('Anti-contournement (#265)', () => {
    it('POST /:id/messages avec un numéro de téléphone → 400 et journalise', async () => {
      const res = await request(app)
        .post(`/api/conversations/${state.conversationId}/messages`)
        .set('Cookie', clientCookie())
        .send({ body: 'Appelle-moi au 90 12 34 56 pour régler ça.' })
      expect(res.status).toBe(400)
      const logged = await prisma.contournementAttempt.findFirst({ where: { conversationId: state.conversationId, userId: state.clientId } })
      expect(logged?.reason).toBe('phone')
    })

    it('POST /:id/messages avec un texte normal → 201', async () => {
      const res = await request(app).post(`/api/conversations/${state.conversationId}/messages`).set('Cookie', clientCookie()).send({ body: 'Merci beaucoup, à bientôt !' })
      expect(res.status).toBe(201)
    })
  })

  describe('Paiement au solde insuffisant', () => {
    it('POST /:id/pay → 402 quand le chercheur n’a pas assez de solde', async () => {
      // Nouveau chercheur vérifié, sans solde.
      const poor = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `x${randomUUID().slice(0, 8)}` } })
      const poorToken = randomUUID()
      await prisma.session.create({ data: { token: poorToken, userId: poor.id, expiresAt: new Date(Date.now() + 3_600_000) } })
      await prisma.verification.create({ data: { userId: poor.id } })
      const cookie = `wt_session=${poorToken}`

      const created = await request(app).post('/api/conversations').set('Cookie', cookie).send({ providerId: state.providerId })
      const convId = created.body.conversation.id
      await request(app).post(`/api/conversations/${convId}/first-contact`).set('Cookie', cookie).send({ description: 'Petit besoin.', contact: 'x@example.com' })

      const res = await request(app).post(`/api/conversations/${convId}/pay`).set('Cookie', cookie)
      expect(res.status).toBe(402)

      // Nettoyage local.
      await prisma.escrowOrder.deleteMany({ where: { conversationId: convId } }).catch(() => undefined)
      await prisma.conversation.deleteMany({ where: { id: convId } }).catch(() => undefined)
      await prisma.verification.deleteMany({ where: { userId: poor.id } }).catch(() => undefined)
      await prisma.session.deleteMany({ where: { userId: poor.id } }).catch(() => undefined)
      await prisma.user.deleteMany({ where: { id: poor.id } }).catch(() => undefined)
    })
  })

  describe('Contacter exige une identité vérifiée', () => {
    it('POST /conversations d’un client non vérifié → 403', async () => {
      const unverified = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `u${randomUUID().slice(0, 8)}` } })
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId: unverified.id, expiresAt: new Date(Date.now() + 3_600_000) } })
      const res = await request(app).post('/api/conversations').set('Cookie', `wt_session=${token}`).send({ providerId: state.providerId })
      expect(res.status).toBe(403)
      await prisma.session.deleteMany({ where: { userId: unverified.id } }).catch(() => undefined)
      await prisma.user.deleteMany({ where: { id: unverified.id } }).catch(() => undefined)
    })
  })
})
