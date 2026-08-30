import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du sous-lot admin 3 — actions KYC & vérification, portées iso depuis
 * `server/api/admin/providers/[id]/{kyc-approve,kyc-reject,verify}.post.ts`
 * (ADR-0017). Vérifie le gating, la validation, la traçabilité (audit) et la
 * révocation réelle du badge sur refus.
 */
describe('Contrat — admin actions prestataire/KYC (/api/admin)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const PASSWORD = 'secret123'
  const state = {
    superId: '', superToken: '', restrictedId: '', restrictedToken: '', clientId: '', clientToken: '',
    providerUserId: '', profileId: '',
  }

  const bearer = (t: string) => `Bearer ${t}`
  const authed = (t: string) => ({ Authorization: bearer(t) })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'Sup', lastName: 'Admin' } })
    state.superId = superAdmin.id
    // Admin restreint : possède users.view mais PAS providers.verify.
    const restricted = await prisma.user.create({ data: { contact: `mod-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: JSON.stringify(['users.view']), username: `mod${suffix}`, firstName: 'Mod', lastName: 'R' } })
    state.restrictedId = restricted.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}` } })
    state.clientId = client.id
    const providerUser = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pro${suffix}`, firstName: 'Kofi', lastName: 'P' } })
    state.providerUserId = providerUser.id

    const mkToken = async (userId: string) => {
      const token = randomUUID()
      await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3_600_000) } })
      return token
    }
    state.superToken = await mkToken(superAdmin.id)
    state.restrictedToken = await mkToken(restricted.id)
    state.clientToken = await mkToken(client.id)

    const sector = await prisma.sector.upsert({ where: { slug: 'btp' }, create: { slug: 'btp', name: 'Artisanat & BTP', emoji: '🔨', color: '#D97706', ink: '#1A1A1A' }, update: {} })
    const profile = await prisma.providerProfile.create({ data: { userId: providerUser.id, displayName: `Pro-${suffix}`, sectorId: sector.id, city: 'Kara', verified: false } })
    state.profileId = profile.id
    // Soumission KYC (badge auto-certifié) pour tester la révocation au refus.
    await prisma.verification.create({ data: { userId: providerUser.id, idCardImage: 'data:image/png;base64,AAA', passportPhotoImage: 'data:image/png;base64,BBB', submittedAt: new Date() } })
  })

  afterAll(async () => {
    const userIds = [state.superId, state.restrictedId, state.clientId, state.providerUserId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.kycDecision.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.verification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: state.providerUserId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  describe('KYC', () => {
    it('kyc-approve compte client → 403', async () => {
      expect((await request(app).post(`/api/admin/providers/${state.providerUserId}/kyc-approve`).set(authed(state.clientToken)).send({})).status).toBe(403)
    })

    it('kyc-approve (rôle admin) → 200, décision tracée', async () => {
      const res = await request(app).post(`/api/admin/providers/${state.providerUserId}/kyc-approve`).set(authed(state.superToken)).send({ note: 'RAS' })
      expect(res.status).toBe(200)
      expect(res.body.decision.status).toBe('approved')
      const audit = await prisma.auditLog.findFirst({ where: { actorId: state.superId, action: 'kyc.approve', targetId: state.providerUserId } })
      expect(audit).toBeTruthy()
    })

    it('kyc-reject sans motif → 400', async () => {
      const res = await request(app).post(`/api/admin/providers/${state.providerUserId}/kyc-reject`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Le motif est obligatoire.')
    })

    it('kyc-reject avec motif → 200, badge révoqué + tracé', async () => {
      expect(await prisma.verification.count({ where: { userId: state.providerUserId } })).toBe(1)
      const res = await request(app).post(`/api/admin/providers/${state.providerUserId}/kyc-reject`).set(authed(state.superToken)).send({ reason: 'Pièce illisible' })
      expect(res.status).toBe(200)
      expect(res.body.decision.status).toBe('rejected')
      expect(res.body.decision.reason).toBe('Pièce illisible')
      // La soumission est supprimée → badge « Vérifié » réellement révoqué.
      expect(await prisma.verification.count({ where: { userId: state.providerUserId } })).toBe(0)
      const audit = await prisma.auditLog.findFirst({ where: { actorId: state.superId, action: 'kyc.reject', targetId: state.providerUserId } })
      expect(audit).toBeTruthy()
    })
  })

  describe('Bascule du badge (providers.verify)', () => {
    it('admin restreint sans providers.verify → 403', async () => {
      expect((await request(app).post(`/api/admin/providers/${state.profileId}/verify`).set(authed(state.restrictedToken)).send({})).status).toBe(403)
    })

    it('profil inconnu → 404', async () => {
      const res = await request(app).post('/api/admin/providers/does-not-exist/verify').set(authed(state.superToken)).send({})
      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Profil prestataire introuvable.')
    })

    it('verify défaut → 200, verified=true', async () => {
      const res = await request(app).post(`/api/admin/providers/${state.profileId}/verify`).set(authed(state.superToken)).send({})
      expect(res.status).toBe(200)
      expect(res.body.provider.verified).toBe(true)
    })

    it('verify { verified: false } → 200, verified=false', async () => {
      const res = await request(app).post(`/api/admin/providers/${state.profileId}/verify`).set(authed(state.superToken)).send({ verified: false })
      expect(res.status).toBe(200)
      expect(res.body.provider.verified).toBe(false)
    })
  })
})
