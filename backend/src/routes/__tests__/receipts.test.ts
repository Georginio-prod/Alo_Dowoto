import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat des reçus PDF (#363) portés vers Express (Phase 2, ADR-0016) : reçu
 * d'un paiement d'abonnement confirmé et reçu d'un mouvement d'escrow, tous deux
 * réservés à leur titulaire. Base de test ISOLÉE. On vérifie les en-têtes, le
 * nom de fichier et le magic `%PDF` du corps ; le contenu détaillé du document
 * relève des tests unitaires côté Nitro (générateur porté verbatim).
 */
describe('Contrat — reçus PDF (/api/payments, /api/wallet)', () => {
  const app = createServer()
  const owner = { userId: '', token: '', cookie: '' }
  const other = { userId: '', token: '', cookie: '' }
  const counterparty = { userId: '' }
  const ids = {
    subscriptionId: '',
    confirmedPaymentId: '',
    pendingPaymentId: '',
    escrowMovementId: '',
    rechargeMovementId: '',
  }

  beforeAll(async () => {
    const mk = async (state: { userId: string; token: string; cookie: string }, role: 'client' | 'prestataire') => {
      const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role, username: `u${randomUUID().slice(0, 8)}`, firstName: 'Ama', lastName: 'Koffi' } })
      state.userId = u.id
      state.token = randomUUID()
      state.cookie = `wt_session=${state.token}`
      await prisma.session.create({ data: { token: state.token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    }
    await mk(owner, 'prestataire')
    await mk(other, 'client')
    const cp = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `cp${randomUUID().slice(0, 8)}`, firstName: 'Yao', lastName: 'Mensah' } })
    counterparty.userId = cp.id

    const sub = await prisma.subscription.create({ data: { userId: owner.userId, plan: 'mensuel', status: 'actif' } })
    ids.subscriptionId = sub.id

    const confirmed = await prisma.payment.create({ data: { userId: owner.userId, subscriptionId: sub.id, provider: 'flooz', phone: '+22890000000', amount: 5000, status: 'confirmed', operatorRef: 'OP-123', resolvedAt: new Date() } })
    ids.confirmedPaymentId = confirmed.id
    const pending = await prisma.payment.create({ data: { userId: owner.userId, subscriptionId: sub.id, provider: 'tmoney', phone: '+22890000000', amount: 5000, status: 'pending' } })
    ids.pendingPaymentId = pending.id

    const escrow = await prisma.walletMovement.create({ data: { walletUserId: owner.userId, type: 'escrow_debit', amount: 12000, reference: randomUUID(), counterpartyUserId: counterparty.userId } })
    ids.escrowMovementId = escrow.id
    const recharge = await prisma.walletMovement.create({ data: { walletUserId: owner.userId, type: 'recharge', amount: 3000, reference: randomUUID() } })
    ids.rechargeMovementId = recharge.id
  })

  afterAll(async () => {
    const userIds = [owner.userId, other.userId, counterparty.userId]
    await prisma.payment.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: userIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('GET /payments/:id/receipt', () => {
    it('sans session → 401', async () => {
      expect((await request(app).get(`/api/payments/${ids.confirmedPaymentId}/receipt`)).status).toBe(401)
    })

    it('paiement confirmé → PDF téléchargeable', async () => {
      const res = await request(app).get(`/api/payments/${ids.confirmedPaymentId}/receipt`).set('Cookie', owner.cookie).responseType('blob')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('application/pdf')
      expect(res.headers['content-disposition']).toContain(`recu-abonnement-${ids.confirmedPaymentId.slice(0, 8)}.pdf`)
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF')
    })

    it('locale=en → PDF également', async () => {
      const res = await request(app).get(`/api/payments/${ids.confirmedPaymentId}/receipt?locale=en`).set('Cookie', owner.cookie).responseType('blob')
      expect(res.status).toBe(200)
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF')
    })

    it('paiement non confirmé → 400', async () => {
      const res = await request(app).get(`/api/payments/${ids.pendingPaymentId}/receipt`).set('Cookie', owner.cookie)
      expect(res.status).toBe(400)
    })

    it("paiement d'un autre compte → 404", async () => {
      const res = await request(app).get(`/api/payments/${ids.confirmedPaymentId}/receipt`).set('Cookie', other.cookie)
      expect(res.status).toBe(404)
    })
  })

  describe('GET /wallet/movements/:id/receipt', () => {
    it('sans session → 401', async () => {
      expect((await request(app).get(`/api/wallet/movements/${ids.escrowMovementId}/receipt`)).status).toBe(401)
    })

    it('débit de séquestre → PDF (avec contrepartie)', async () => {
      const res = await request(app).get(`/api/wallet/movements/${ids.escrowMovementId}/receipt`).set('Cookie', owner.cookie).responseType('blob')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('application/pdf')
      expect(res.headers['content-disposition']).toContain(`recu-${ids.escrowMovementId.slice(0, 8)}.pdf`)
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF')
    })

    it('mouvement de type recharge → 400', async () => {
      const res = await request(app).get(`/api/wallet/movements/${ids.rechargeMovementId}/receipt`).set('Cookie', owner.cookie)
      expect(res.status).toBe(400)
    })

    it("mouvement d'un autre compte → 404", async () => {
      const res = await request(app).get(`/api/wallet/movements/${ids.escrowMovementId}/receipt`).set('Cookie', other.cookie)
      expect(res.status).toBe(404)
    })
  })
})
