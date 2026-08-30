import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 2 — fiches de DÉTAIL en lecture seule, portées iso
 * depuis `server/api/admin/{users/[id],conversations/[id]}.get.ts` (ADR-0017).
 * Vérifie le gating (403/404), la non-exposition du `passwordHash`, le résumé
 * financier, et la résolution client/prestataire + fil de messages.
 */
describe('Contrat — admin fiches de détail (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '', superToken: '', clientId: '', clientToken: '',
    providerUserId: '', subscriptionId: '', paymentId: '', reviewId: '', conversationId: '',
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)

    const superAdmin = await prisma.user.create({
      data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'Sup', lastName: 'Admin' },
    })
    state.superId = superAdmin.id
    const client = await prisma.user.create({
      data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}`, firstName: 'Ama', lastName: 'Cliente', location: 'Lomé' },
    })
    state.clientId = client.id
    const providerUser = await prisma.user.create({
      data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${suffix}`, firstName: 'Kofi', lastName: 'Presta', location: 'Kara' },
    })
    state.providerUserId = providerUser.id

    const mkToken = async (userId: string) => {
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3_600_000) } })
      return token
    }
    state.superToken = await mkToken(superAdmin.id)
    state.clientToken = await mkToken(client.id)

    // Profil prestataire (secteur réel 'btp' upserté) pour la résolution d'identité.
    const sector = await prisma.sector.upsert({
      where: { slug: 'btp' },
      create: { slug: 'btp', name: 'Artisanat & BTP', emoji: '🔨', color: '#D97706', ink: '#1A1A1A' },
      update: {},
    })
    await prisma.providerProfile.create({
      data: { userId: providerUser.id, displayName: `Pro-${suffix}`, sectorId: sector.id, city: 'Kara', verified: true },
    })

    // Résumé financier du client : abonnement + paiement confirmé + avis écrit.
    const sub = await prisma.subscription.create({ data: { userId: client.id, plan: `plan-${suffix}`, status: 'actif' } })
    state.subscriptionId = sub.id
    const payment = await prisma.payment.create({ data: { subscriptionId: sub.id, userId: client.id, provider: 'tmoney', phone: `+228${suffix}`, amount: 3000, status: 'confirmed' } })
    state.paymentId = payment.id

    // Conversation client↔prestataire + fil de messages.
    const conv = await prisma.conversation.create({ data: { clientId: client.id, providerId: providerUser.id, firstContactDone: true, clientContact: '+228 90 00 00 00' } })
    state.conversationId = conv.id
    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, senderId: client.id, senderRole: 'client', body: 'Bonjour', kind: 'text' },
        { conversationId: conv.id, senderId: providerUser.id, senderRole: 'prestataire', body: 'Bonjour, disponible', kind: 'text' },
      ],
    })
    const review = await prisma.review.create({ data: { conversationId: conv.id, authorId: client.id, targetId: providerUser.id, rating: 5, comment: 'Parfait' } })
    state.reviewId = review.id
  })

  afterAll(async () => {
    const userIds = [state.superId, state.clientId, state.providerUserId]
    await prisma.review.deleteMany({ where: { id: state.reviewId } }).catch(() => undefined)
    await prisma.message.deleteMany({ where: { conversationId: state.conversationId } }).catch(() => undefined)
    await prisma.conversation.deleteMany({ where: { id: state.conversationId } }).catch(() => undefined)
    await prisma.payment.deleteMany({ where: { id: state.paymentId } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { id: state.subscriptionId } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: state.providerUserId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('GET /admin/users/:id', () => {
    it('compte client → 403', async () => {
      expect((await request(app).get(`/api/admin/users/${state.clientId}`).set(authed(state.clientToken))).status).toBe(403)
    })

    it('id inconnu → 404', async () => {
      const res = await request(app).get('/api/admin/users/does-not-exist').set(authed(state.superToken))
      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Utilisateur introuvable.')
    })

    it('fiche client → 200, stats financières, jamais de passwordHash', async () => {
      const res = await request(app).get(`/api/admin/users/${state.clientId}`).set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body).not.toHaveProperty('passwordHash')
      expect(res.body.passwordSet).toBe(false)
      expect(res.body.isProvider).toBe(false)
      expect(res.body.isSubscriber).toBe(true)
      expect(res.body.stats.totalPaid).toBe(3000)
      expect(res.body.stats.confirmedPayments).toBe(1)
      expect(res.body.stats.reviewCount).toBe(1)
      expect(res.body.payments.some((p: { id: string }) => p.id === state.paymentId)).toBe(true)
    })

    it('fiche prestataire → 200, bloc provider renseigné', async () => {
      const res = await request(app).get(`/api/admin/users/${state.providerUserId}`).set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.isProvider).toBe(true)
      expect(res.body.provider.displayName).toBe(`Pro-${suffix}`)
      expect(res.body.provider.verified).toBe(true)
    })
  })

  describe('GET /admin/conversations/:id', () => {
    it('id inconnu → 404', async () => {
      const res = await request(app).get('/api/admin/conversations/nope').set(authed(state.superToken))
      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Conversation introuvable.')
    })

    it('détail → 200, client + prestataire résolus + messages', async () => {
      const res = await request(app).get(`/api/admin/conversations/${state.conversationId}`).set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.firstContactDone).toBe(true)
      expect(res.body.client.id).toBe(state.clientId)
      expect(res.body.client.name).toBe('Ama Cliente')
      expect(res.body.provider.id).toBe(state.providerUserId)
      expect(res.body.provider.isRealAccount).toBe(true)
      expect(res.body.provider.name).toBe(`Pro-${suffix}`)
      expect(res.body.provider.sector).toBe('btp')
      expect(res.body.messages).toHaveLength(2)
      expect(res.body.messages[0].body).toBe('Bonjour')
    })
  })
})
