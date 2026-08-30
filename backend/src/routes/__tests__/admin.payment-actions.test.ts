import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — actions paiements & séquestre, portées iso depuis
 * `server/api/admin/payments/[id]/{fail,refund,release,retry}.post.ts` (ADR-0017).
 * Vérifie gating, transitions et rejeu (avec activation d'abonnement).
 *
 * Isolation : `release` crédite la commission au portefeuille PLATEFORME. On
 * emploie un montant dont la commission (10 %) arrondit à 0 pour ne pas fausser
 * les tests escrow qui vérifient le solde plateforme réel en parallèle.
 */
describe('Contrat — admin actions paiements (/api/admin/payments)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '', superToken: '', restrictedId: '', restrictedToken: '', clientId: '', clientToken: '',
    pendingPaymentId: '', failedPaymentId: '', subId: '',
    refundOrderId: '', releaseOrderId: '', orderIds: [] as string[],
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const restricted = await prisma.user.create({ data: { contact: `mod-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: JSON.stringify(['payments.view']), username: `mod${suffix}`, firstName: 'M', lastName: 'R' } })
    state.restrictedId = restricted.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}` } })
    state.clientId = client.id

    const mkToken = async (userId: string) => {
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3_600_000) } })
      return token
    }
    state.superToken = await mkToken(superAdmin.id)
    state.restrictedToken = await mkToken(restricted.id)
    state.clientToken = await mkToken(client.id)

    const sub = await prisma.subscription.create({ data: { userId: client.id, plan: 'mensuel', status: 'en_attente' } })
    state.subId = sub.id
    const pending = await prisma.payment.create({ data: { subscriptionId: sub.id, userId: client.id, provider: 'flooz', phone: `+228${suffix}`, amount: 5000, status: 'pending' } })
    state.pendingPaymentId = pending.id
    const failed = await prisma.payment.create({ data: { subscriptionId: sub.id, userId: client.id, provider: 'flooz', phone: `+228${suffix}`, amount: 5000, status: 'failed' } })
    state.failedPaymentId = failed.id

    const cId = `client-${suffix}`
    const pId = `prov-${suffix}`
    const refundOrder = await prisma.escrowOrder.create({ data: { conversationId: `conv-ref-${suffix}`, clientId: cId, providerId: pId, amount: 6000, status: 'in_escrow' } })
    const releaseOrder = await prisma.escrowOrder.create({ data: { conversationId: `conv-rel-${suffix}`, clientId: cId, providerId: pId, amount: 4, status: 'in_escrow' } })
    state.refundOrderId = refundOrder.id
    state.releaseOrderId = releaseOrder.id
    state.orderIds = [refundOrder.id, releaseOrder.id]
  })

  afterAll(async () => {
    const userIds = [state.superId, state.restrictedId, state.clientId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.walletMovement.deleteMany({ where: { reference: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.escrowOrder.deleteMany({ where: { id: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.payment.deleteMany({ where: { id: { in: [state.pendingPaymentId, state.failedPaymentId] } } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { id: state.subId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('fail (payments.manage)', () => {
    it('compte client → 403', async () => {
      expect((await request(app).post(`/api/admin/payments/${state.pendingPaymentId}/fail`).set(authed(state.clientToken)).send({})).status).toBe(403)
    })
    it('admin restreint sans payments.manage → 403', async () => {
      expect((await request(app).post(`/api/admin/payments/${state.pendingPaymentId}/fail`).set(authed(state.restrictedToken)).send({})).status).toBe(403)
    })
    it('paiement inexistant → 404', async () => {
      expect((await request(app).post('/api/admin/payments/nope/fail').set(authed(state.superToken)).send({})).status).toBe(404)
    })
    it('paiement déjà échoué → 400', async () => {
      expect((await request(app).post(`/api/admin/payments/${state.failedPaymentId}/fail`).set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('paiement en attente → 200, statut failed', async () => {
      const res = await request(app).post(`/api/admin/payments/${state.pendingPaymentId}/fail`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('failed')
    })
  })

  describe('refund / release (rôle admin)', () => {
    it('refund sans motif → 400', async () => {
      expect((await request(app).post(`/api/admin/payments/${state.refundOrderId}/refund`).set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('refund commande inconnue → 400', async () => {
      expect((await request(app).post('/api/admin/payments/nope/refund').set(authed(state.superToken)).send({ reason: 'x' })).status).toBe(400)
    })
    it('refund commande sous séquestre → 200', async () => {
      const res = await request(app).post(`/api/admin/payments/${state.refundOrderId}/refund`).set(authed(state.superToken)).send({ reason: 'geste commercial' })
      expect(res.status).toBe(200)
      expect(await prisma.escrowOrder.findUnique({ where: { id: state.refundOrderId } }).then((o) => o?.status)).toBe('refunded')
    })
    it('release commande inconnue → 400', async () => {
      expect((await request(app).post('/api/admin/payments/nope/release').set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('release commande sous séquestre → 200', async () => {
      const res = await request(app).post(`/api/admin/payments/${state.releaseOrderId}/release`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(200)
      expect(await prisma.escrowOrder.findUnique({ where: { id: state.releaseOrderId } }).then((o) => o?.status)).toBe('released')
    })
  })

  describe('retry (rôle admin)', () => {
    it('type invalide → 400', async () => {
      expect((await request(app).post(`/api/admin/payments/${state.failedPaymentId}/retry`).set(authed(state.superToken)).send({ kind: 'autre' })).status).toBe(400)
    })
    it('transaction inconnue → 400', async () => {
      expect((await request(app).post('/api/admin/payments/nope/retry').set(authed(state.superToken)).send({ kind: 'subscription_payment' })).status).toBe(400)
    })
    it('paiement échoué rejoué → 200, confirmé + abonnement activé', async () => {
      const res = await request(app).post(`/api/admin/payments/${state.failedPaymentId}/retry`).set(authed(state.superToken)).send({ kind: 'subscription_payment' })
      expect(res.status).toBe(200)
      expect(await prisma.payment.findUnique({ where: { id: state.failedPaymentId } }).then((p) => p?.status)).toBe('confirmed')
      expect(await prisma.subscription.findUnique({ where: { id: state.subId } }).then((s) => s?.status)).toBe('actif')
    })
  })
})
