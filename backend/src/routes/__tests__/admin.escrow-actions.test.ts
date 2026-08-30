import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — arbitrage/remboursement du séquestre, portés iso
 * depuis `server/api/admin/escrow/[conversationId]/{arbitrate,refund}.post.ts`
 * (ADR-0017). Vérifie le gating (`escrow.manage`), la validation du verdict et
 * les transitions de statut via les primitives atomiques déjà portées.
 *
 * Note d'isolation : l'arbitrage en faveur du prestataire crédite le portefeuille
 * PLATEFORME (commission). On choisit un montant dont la commission (10 %)
 * arrondit à 0 pour ne pas fausser les tests escrow qui vérifient le solde
 * plateforme réel en exécution parallèle.
 */
describe('Contrat — admin arbitrage séquestre (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '', superToken: '', restrictedId: '', restrictedToken: '', clientId: '', clientToken: '',
    disputedConv: `conv-disp-${suffix}`, escrowConv: `conv-esc-${suffix}`, releasedConv: `conv-rel-${suffix}`,
    orderIds: [] as string[],
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'Sup', lastName: 'A' } })
    state.superId = superAdmin.id
    // Admin restreint : escrow.view mais PAS escrow.manage.
    const restricted = await prisma.user.create({ data: { contact: `mod-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: JSON.stringify(['escrow.view']), username: `mod${suffix}`, firstName: 'Mod', lastName: 'R' } })
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

    const cId = `client-${suffix}`
    const pId = `prov-${suffix}`
    // amount 4 → commission round(0.4)=0 : aucun crédit plateforme.
    const disputed = await prisma.escrowOrder.create({ data: { conversationId: state.disputedConv, clientId: cId, providerId: pId, amount: 4, status: 'disputed', disputeReason: 'conflit' } })
    const inEscrow = await prisma.escrowOrder.create({ data: { conversationId: state.escrowConv, clientId: cId, providerId: pId, amount: 6000, status: 'in_escrow' } })
    const released = await prisma.escrowOrder.create({ data: { conversationId: state.releasedConv, clientId: cId, providerId: pId, amount: 7000, status: 'released' } })
    state.orderIds = [disputed.id, inEscrow.id, released.id]
  })

  afterAll(async () => {
    const userIds = [state.superId, state.restrictedId, state.clientId]
    await prisma.walletMovement.deleteMany({ where: { reference: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.escrowOrder.deleteMany({ where: { id: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Arbitrage (escrow.manage)', () => {
    it('compte client → 403', async () => {
      expect((await request(app).post(`/api/admin/escrow/${state.disputedConv}/arbitrate`).set(authed(state.clientToken)).send({ outcome: 'provider' })).status).toBe(403)
    })

    it('admin restreint sans escrow.manage → 403', async () => {
      expect((await request(app).post(`/api/admin/escrow/${state.disputedConv}/arbitrate`).set(authed(state.restrictedToken)).send({ outcome: 'provider' })).status).toBe(403)
    })

    it('verdict invalide → 400', async () => {
      const res = await request(app).post(`/api/admin/escrow/${state.disputedConv}/arbitrate`).set(authed(state.superToken)).send({ outcome: 'peut-etre' })
      expect(res.status).toBe(400)
    })

    it('commande inexistante → 404', async () => {
      expect((await request(app).post('/api/admin/escrow/nope/arbitrate').set(authed(state.superToken)).send({ outcome: 'provider' })).status).toBe(404)
    })

    it('commande non litigieuse → 409', async () => {
      const res = await request(app).post(`/api/admin/escrow/${state.escrowConv}/arbitrate`).set(authed(state.superToken)).send({ outcome: 'provider' })
      expect(res.status).toBe(409)
    })

    it('litige tranché en faveur du prestataire → 200, statut released', async () => {
      const res = await request(app).post(`/api/admin/escrow/${state.disputedConv}/arbitrate`).set(authed(state.superToken)).send({ outcome: 'provider' })
      expect(res.status).toBe(200)
      expect(res.body.order.status).toBe('released')
    })
  })

  describe('Remboursement (escrow.manage)', () => {
    it('commande inexistante → 404', async () => {
      expect((await request(app).post('/api/admin/escrow/nope/refund').set(authed(state.superToken)).send({})).status).toBe(404)
    })

    it('commande déjà versée → 409', async () => {
      const res = await request(app).post(`/api/admin/escrow/${state.releasedConv}/refund`).set(authed(state.superToken)).send({ reason: 'test' })
      expect(res.status).toBe(409)
    })

    it('commande sous séquestre → 200, statut refunded', async () => {
      const res = await request(app).post(`/api/admin/escrow/${state.escrowConv}/refund`).set(authed(state.superToken)).send({ reason: 'Litige hors ligne' })
      expect(res.status).toBe(200)
      expect(res.body.order.status).toBe('refunded')
      expect(res.body.order.cancelReason).toBe('Litige hors ligne')
    })
  })
})
