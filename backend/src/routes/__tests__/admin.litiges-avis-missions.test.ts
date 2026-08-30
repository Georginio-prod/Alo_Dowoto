import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — litiges, avis et missions (dashboard web,
 * modules 4/6/8). Portées iso depuis `server/api/admin/{disputes,reviews,missions}/**`
 * (ADR-0017). Rôle admin. Les résolutions « provider » et la validation forcée
 * libèrent la commission au portefeuille plateforme : montant à commission nulle
 * (arrondi à 0) pour ne pas fausser les tests escrow parallèles.
 */
describe('Contrat — admin litiges/avis/missions (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = {
    superId: '', superToken: '', clientId: '', clientToken: '',
    provA: '', provB: '', provC: '', provD: '',
    convDP: '', convDC: '', convFV: '', convRV: '',
    orderDP: '', orderDC: '', orderEV: '', orderCancel: '', orderFV: '', orderReassign: '', orderNudge: '',
    reviewId: '',
    orderIds: [] as string[], convIds: [] as string[], providerIds: [] as string[],
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}`, firstName: 'Ama', lastName: 'C' } })
    state.clientId = client.id
    const mkProv = async (n: string) => (await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${n}${suffix}` } })).id
    state.provA = await mkProv('a'); state.provB = await mkProv('b'); state.provC = await mkProv('c'); state.provD = await mkProv('d')
    state.providerIds = [state.provA, state.provB, state.provC, state.provD]

    const mkToken = async (id: string) => { const t = randomUUID(); await prisma.session.create({ data: { token: t, userId: id, expiresAt: new Date(Date.now() + 3_600_000) } }); return t }
    state.superToken = await mkToken(superAdmin.id)
    state.clientToken = await mkToken(client.id)

    const mkConv = async (providerId: string) => (await prisma.conversation.create({ data: { clientId: client.id, providerId, firstContactDone: true } })).id
    state.convDP = await mkConv(state.provA); state.convDC = await mkConv(state.provB); state.convFV = await mkConv(state.provC); state.convRV = await mkConv(state.provD)
    state.convIds = [state.convDP, state.convDC, state.convFV, state.convRV]

    const cId = `c-${suffix}`, pId = `p-${suffix}`
    const mkOrder = async (conversationId: string, status: string, amount: number) => (await prisma.escrowOrder.create({ data: { conversationId, clientId: cId, providerId: pId, amount, status: status as never, ...(status === 'disputed' ? { disputedAt: new Date(), disputeReason: 'x' } : {}) } })).id
    state.orderDP = await mkOrder(state.convDP, 'disputed', 4)
    state.orderDC = await mkOrder(state.convDC, 'disputed', 5000)
    state.orderEV = await mkOrder(`ev-${suffix}`, 'disputed', 5000)
    state.orderCancel = await mkOrder(`cx-${suffix}`, 'in_escrow', 6000)
    state.orderFV = await mkOrder(state.convFV, 'delivered', 4)
    state.orderReassign = await mkOrder(`rx-${suffix}`, 'in_escrow', 3000)
    state.orderNudge = await mkOrder(`nx-${suffix}`, 'in_escrow', 3000)
    state.orderIds = [state.orderDP, state.orderDC, state.orderEV, state.orderCancel, state.orderFV, state.orderReassign, state.orderNudge]

    const review = await prisma.review.create({ data: { conversationId: state.convRV, authorId: client.id, targetId: state.provD, rating: 5, comment: 'Très bien' } })
    state.reviewId = review.id
  })

  afterAll(async () => {
    const userIds = [state.superId, state.clientId, ...state.providerIds]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.reviewModeration.deleteMany({ where: { reviewId: state.reviewId } }).catch(() => undefined)
    await prisma.review.deleteMany({ where: { id: state.reviewId } }).catch(() => undefined)
    await prisma.adminNote.deleteMany({ where: { targetId: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.walletMovement.deleteMany({ where: { reference: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.message.deleteMany({ where: { conversationId: { in: state.convIds } } }).catch(() => undefined)
    await prisma.escrowOrder.deleteMany({ where: { id: { in: state.orderIds } } }).catch(() => undefined)
    await prisma.conversation.deleteMany({ where: { id: { in: state.convIds } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('Litiges', () => {
    it('compte client → 403', async () => {
      expect((await request(app).get('/api/admin/disputes').set(authed(state.clientToken))).status).toBe(403)
    })
    it('liste → contient les litiges ouverts', async () => {
      const res = await request(app).get('/api/admin/disputes').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.disputes.some((d: { id: string }) => d.id === state.orderDP)).toBe(true)
    })
    it('resolve décision invalide → 400', async () => {
      expect((await request(app).post(`/api/admin/disputes/${state.orderDP}/resolve`).set(authed(state.superToken)).send({ outcome: 'zzz' })).status).toBe(400)
    })
    it('resolve provider → 200, commande libérée', async () => {
      const res = await request(app).post(`/api/admin/disputes/${state.orderDP}/resolve`).set(authed(state.superToken)).send({ outcome: 'provider', note: 'RAS' })
      expect(res.status).toBe(200)
      expect(await prisma.escrowOrder.findUnique({ where: { id: state.orderDP } }).then((o) => o?.status)).toBe('released')
    })
    it('resolve client → 200, remboursé', async () => {
      const res = await request(app).post(`/api/admin/disputes/${state.orderDC}/resolve`).set(authed(state.superToken)).send({ outcome: 'client' })
      expect(res.status).toBe(200)
      expect(await prisma.escrowOrder.findUnique({ where: { id: state.orderDC } }).then((o) => o?.status)).toBe('refunded')
    })
    it('resolve d’un litige déjà clos → 400', async () => {
      expect((await request(app).post(`/api/admin/disputes/${state.orderDP}/resolve`).set(authed(state.superToken)).send({ outcome: 'client' })).status).toBe(400)
    })
    it('request-evidence → 200 ; inconnu → 404', async () => {
      expect((await request(app).post(`/api/admin/disputes/${state.orderEV}/request-evidence`).set(authed(state.superToken)).send({})).status).toBe(200)
      expect((await request(app).post('/api/admin/disputes/nope/request-evidence').set(authed(state.superToken)).send({})).status).toBe(404)
    })
  })

  describe('Avis', () => {
    it('liste → contient l’avis', async () => {
      const res = await request(app).get('/api/admin/reviews').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(res.body.reviews.some((r: { id: string }) => r.id === state.reviewId)).toBe(true)
    })
    it('hide sans motif → 400', async () => {
      expect((await request(app).post(`/api/admin/reviews/${state.reviewId}/hide`).set(authed(state.superToken)).send({})).status).toBe(400)
    })
    it('hide → masqué, restore → réaffiché', async () => {
      const h = await request(app).post(`/api/admin/reviews/${state.reviewId}/hide`).set(authed(state.superToken)).send({ reason: 'insultes' })
      expect(h.status).toBe(200)
      expect(await prisma.reviewModeration.findUnique({ where: { reviewId: state.reviewId } }).then((m) => m?.hidden)).toBe(true)
      const r = await request(app).post(`/api/admin/reviews/${state.reviewId}/restore`).set(authed(state.superToken)).send({})
      expect(r.status).toBe(200)
      expect(await prisma.reviewModeration.findUnique({ where: { reviewId: state.reviewId } }).then((m) => m?.hidden)).toBe(false)
    })
    it('contact-author → 200 (notification) ; avis inconnu → 404', async () => {
      const ok = await request(app).post(`/api/admin/reviews/${state.reviewId}/contact-author`).set(authed(state.superToken)).send({ subject: 'Bonjour', body: 'Merci de préciser votre avis' })
      expect(ok.status).toBe(200)
      expect(await prisma.notification.count({ where: { userId: state.clientId, type: 'admin_message' } })).toBeGreaterThanOrEqual(1)
      expect((await request(app).post('/api/admin/reviews/nope/contact-author').set(authed(state.superToken)).send({ subject: 'a', body: 'b' })).status).toBe(404)
    })
  })

  describe('Missions', () => {
    it('liste → missions + brouillons', async () => {
      const res = await request(app).get('/api/admin/missions?pageSize=100').set(authed(state.superToken))
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.missions)).toBe(true)
      expect(Array.isArray(res.body.drafts)).toBe(true)
      expect(res.body.missions.some((m: { id: string }) => m.id === state.orderNudge)).toBe(true)
    })
    it('détail → 200 ; inconnu → 404', async () => {
      const d = await request(app).get(`/api/admin/missions/${state.orderNudge}`).set(authed(state.superToken))
      expect(d.status).toBe(200)
      expect(d.body.mission.id).toBe(state.orderNudge)
      expect((await request(app).get('/api/admin/missions/nope').set(authed(state.superToken))).status).toBe(404)
    })
    it('cancel → 200, remboursée', async () => {
      const res = await request(app).post(`/api/admin/missions/${state.orderCancel}/cancel`).set(authed(state.superToken)).send({ reason: 'litige hors-ligne' })
      expect(res.status).toBe(200)
      expect(await prisma.escrowOrder.findUnique({ where: { id: state.orderCancel } }).then((o) => o?.status)).toBe('refunded')
    })
    it('force-validate → 200, libérée', async () => {
      const res = await request(app).post(`/api/admin/missions/${state.orderFV}/force-validate`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(200)
      expect(res.body.order.status).toBe('released')
    })
    it('note → 200 (note interne enregistrée)', async () => {
      const res = await request(app).post(`/api/admin/missions/${state.orderNudge}/note`).set(authed(state.superToken)).send({ body: 'À surveiller' })
      expect(res.status).toBe(200)
      expect(await prisma.adminNote.count({ where: { targetType: 'mission', targetId: state.orderNudge } })).toBeGreaterThanOrEqual(1)
    })
    it('note vide → 400', async () => {
      expect((await request(app).post(`/api/admin/missions/${state.orderNudge}/note`).set(authed(state.superToken)).send({ body: '   ' })).status).toBe(400)
    })
    it('nudge → 200 ; inconnu → 404', async () => {
      expect((await request(app).post(`/api/admin/missions/${state.orderNudge}/nudge`).set(authed(state.superToken)).send({})).status).toBe(200)
      expect((await request(app).post('/api/admin/missions/nope/nudge').set(authed(state.superToken)).send({})).status).toBe(404)
    })
    it('reassign → 200, prestataire changé ; sans providerId → 400', async () => {
      expect((await request(app).post(`/api/admin/missions/${state.orderReassign}/reassign`).set(authed(state.superToken)).send({})).status).toBe(400)
      const res = await request(app).post(`/api/admin/missions/${state.orderReassign}/reassign`).set(authed(state.superToken)).send({ providerId: state.provA })
      expect(res.status).toBe(200)
      expect(res.body.order.providerId).toBe(state.provA)
    })
  })
})
