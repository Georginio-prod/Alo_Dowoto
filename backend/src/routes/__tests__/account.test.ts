import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat des droits RGPD sur le compte (#286) portés vers Express (Phase 2,
 * ADR-0016) : export (portabilité, jamais les images) et effacement
 * (anonymisation + purge vérification + déconnexion). Base de test ISOLÉE.
 */
describe('Contrat — compte RGPD (/api/account)', () => {
  const app = createServer()
  const client = { userId: '', token: '' }
  const provider = { userId: '', token: '' }
  const doomed = { userId: '', token: '' }
  const sectorId = `sec-${randomUUID()}`

  beforeAll(async () => {
    const c = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${randomUUID().slice(0, 8)}`, firstName: 'Ama', lastName: 'Koffi' } })
    client.userId = c.id
    client.token = randomUUID()
    await prisma.session.create({ data: { token: client.token, userId: c.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const p = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `p${randomUUID().slice(0, 8)}` } })
    provider.userId = p.id
    provider.token = randomUUID()
    await prisma.session.create({ data: { token: provider.token, userId: p.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    await prisma.sector.create({ data: { id: sectorId, slug: `slug-${randomUUID().slice(0, 8)}`, name: 'Test', emoji: '🔧', color: '#000', ink: '#fff' } })
    await prisma.providerProfile.create({ data: { userId: p.id, displayName: 'Presta Test', sectorId } })

    const d = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `d${randomUUID().slice(0, 8)}`, firstName: 'Yao', lastName: 'Doe' } })
    doomed.userId = d.id
    doomed.token = randomUUID()
    await prisma.session.create({ data: { token: doomed.token, userId: d.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  })

  afterAll(async () => {
    const ids = [client.userId, provider.userId, doomed.userId]
    await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: ids } } }).catch(() => undefined)
    await prisma.verification.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.sector.deleteMany({ where: { id: sectorId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  describe('GET /account/export', () => {
    it('sans session → 401', async () => {
      expect((await request(app).get('/api/account/export')).status).toBe(401)
    })

    it('client → forme complète, profil/abonnement null, aucune image', async () => {
      await prisma.walletMovement.create({ data: { walletUserId: client.userId, type: 'recharge', amount: 3000, reference: randomUUID() } })
      await prisma.verification.create({ data: { userId: client.userId, idCardImage: 'data:image/png;base64,AAAA', passportPhotoImage: 'data:image/png;base64,AAAA' } })

      const res = await request(app).get('/api/account/export').set('Cookie', `wt_session=${client.token}`)
      expect(res.status).toBe(200)
      expect(typeof res.body.exportedAt).toBe('number')
      expect(res.body.account).toMatchObject({ id: client.userId, role: 'client', firstName: 'Ama', verified: true })
      expect(res.body.providerProfile).toBeNull()
      expect(res.body.subscription).toBeNull()
      expect(res.body.walletBalance).toBe(3000)
      expect(res.body.verification).toEqual({ submittedAt: expect.any(Number), purgedAt: null })
      // Aucune image ne doit transiter.
      expect(JSON.stringify(res.body)).not.toContain('base64')
    })

    it('prestataire → providerProfile présent', async () => {
      const res = await request(app).get('/api/account/export').set('Cookie', `wt_session=${provider.token}`)
      expect(res.status).toBe(200)
      expect(res.body.account.role).toBe('prestataire')
      expect(res.body.providerProfile).toMatchObject({ displayName: 'Presta Test' })
    })
  })

  describe('POST /account/delete', () => {
    it('sans session → 401', async () => {
      expect((await request(app).post('/api/account/delete')).status).toBe(401)
    })

    it('anonymise le compte, purge la vérification et déconnecte', async () => {
      await prisma.verification.create({ data: { userId: doomed.userId, idCardImage: 'data:image/png;base64,AAAA', passportPhotoImage: 'data:image/png;base64,AAAA' } })

      const res = await request(app).post('/api/account/delete').set('Cookie', `wt_session=${doomed.token}`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })

      // Compte anonymisé en base.
      const row = await prisma.user.findUnique({ where: { id: doomed.userId } })
      expect(row?.firstName).toBe('')
      expect(row?.lastName).toBe('Compte supprimé')
      expect(row?.contact).toContain('compte-supprime-')

      // Vérification effacée.
      expect(await prisma.verification.count({ where: { userId: doomed.userId } })).toBe(0)

      // Sessions supprimées → l'ancien cookie n'authentifie plus.
      const after = await request(app).get('/api/account/export').set('Cookie', `wt_session=${doomed.token}`)
      expect(after.status).toBe(401)
    })
  })
})
