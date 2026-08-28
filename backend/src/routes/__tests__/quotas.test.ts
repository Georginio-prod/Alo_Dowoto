import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat des compteurs d'usage mensuels (#65) portés vers Express (Phase 2,
 * ADR-0016) : quota de contacts (client) et quota de demandes reçues
 * (prestataire, selon la formule). Store volontairement en mémoire (iso Nitro) ;
 * chaque test crée des comptes uniques pour rester indépendant du compteur
 * partagé. Base de test ISOLÉE.
 */
describe('Contrat — quotas (/api/quotas)', () => {
  const app = createServer()
  const client = { userId: '', cookie: '' }
  const provider = { userId: '', cookie: '' }
  const trialProvider = { userId: '', cookie: '' }

  beforeAll(async () => {
    const mk = async (state: { userId: string; cookie: string }, role: 'client' | 'prestataire') => {
      const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role, username: `u${randomUUID().slice(0, 8)}` } })
      state.userId = u.id
      const token = randomUUID()
      state.cookie = `wt_session=${token}`
      await prisma.session.create({ data: { token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    }
    await mk(client, 'client')
    await mk(provider, 'prestataire')
    await mk(trialProvider, 'prestataire')
    // Prestataire avec formule mensuelle active → limite 5.
    await prisma.subscription.create({ data: { userId: provider.userId, plan: 'mensuel', status: 'actif' } })
    // Prestataire avec abonnement en attente → quota 0 (non éligible).
    await prisma.subscription.create({ data: { userId: trialProvider.userId, plan: 'annuel', status: 'en_attente' } })
  })

  afterAll(async () => {
    const ids = [client.userId, provider.userId, trialProvider.userId]
    await prisma.subscription.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  describe('contacts (client)', () => {
    it('sans session → 401 ; mauvais rôle → 403', async () => {
      expect((await request(app).get('/api/quotas/contacts')).status).toBe(401)
      expect((await request(app).get('/api/quotas/contacts').set('Cookie', provider.cookie)).status).toBe(403)
    })

    it('usage initial à 0 puis incrément jusqu\'au quota (429 au-delà)', async () => {
      const initial = await request(app).get('/api/quotas/contacts').set('Cookie', client.cookie)
      expect(initial.status).toBe(200)
      expect(initial.body.usage).toEqual({ count: 0, limit: 3, month: expect.any(String) })

      for (let i = 1; i <= 3; i++) {
        const res = await request(app).post('/api/quotas/contacts').set('Cookie', client.cookie)
        expect(res.status).toBe(200)
        expect(res.body.usage).toMatchObject({ count: i, limit: 3 })
      }

      // 4e contact : quota atteint → 429 avec l'usage.
      const blocked = await request(app).post('/api/quotas/contacts').set('Cookie', client.cookie)
      expect(blocked.status).toBe(429)
      expect(blocked.body.data.usage).toMatchObject({ count: 3, limit: 3 })

      // La lecture reflète le compteur atteint.
      const after = await request(app).get('/api/quotas/contacts').set('Cookie', client.cookie)
      expect(after.body.usage.count).toBe(3)
    })
  })

  describe('requests-received (prestataire)', () => {
    it('mauvais rôle → 403', async () => {
      expect((await request(app).get('/api/quotas/requests-received').set('Cookie', client.cookie)).status).toBe(403)
    })

    it('formule active → limite de la formule, compteur à 0', async () => {
      const res = await request(app).get('/api/quotas/requests-received').set('Cookie', provider.cookie)
      expect(res.status).toBe(200)
      expect(res.body.usage).toEqual({ count: 0, limit: 5, month: expect.any(String) })
    })

    it('abonnement non actif → quota 0 (non éligible)', async () => {
      const res = await request(app).get('/api/quotas/requests-received').set('Cookie', trialProvider.cookie)
      expect(res.status).toBe(200)
      expect(res.body.usage).toEqual({ count: 0, limit: 0, month: expect.any(String) })
    })
  })
})
