import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { providerProfileService } from '../../services/providerProfileService'

/**
 * Contrat des demandes de service (#43/#56/#63/#64) portées vers Express
 * (Phase 2, ADR-0016) : publication (client vérifié), listes, détail, recalcul
 * des correspondances, demandes reçues (prestataire). L'annuaire de démonstration
 * est actif en test (NODE_ENV=test) : une demande secteur « menage » matche des
 * fiches de démo ; un secteur sans démo (« sante ») isole un vrai prestataire
 * pour tester « demandes reçues » de façon déterministe. Base de test ISOLÉE.
 */
describe('Contrat — demandes de service (/api/requests)', () => {
  const app = createServer()
  const client = { userId: '', cookie: '' }
  const unverified = { userId: '', cookie: '' }
  const provider = { userId: '', cookie: '' }
  const other = { userId: '', cookie: '' }

  const mk = async (state: { userId: string; cookie: string }, role: 'client' | 'prestataire') => {
    const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role, username: `u${randomUUID().slice(0, 8)}`, firstName: 'Ama', lastName: 'Koffi', location: 'Lomé' } })
    state.userId = u.id
    const token = randomUUID()
    state.cookie = `wt_session=${token}`
    await prisma.session.create({ data: { token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  }

  beforeAll(async () => {
    await mk(client, 'client')
    await mk(unverified, 'client')
    await mk(provider, 'prestataire')
    await mk(other, 'client')
    // Identité vérifiée requise pour publier (client + other).
    await prisma.verification.create({ data: { userId: client.userId, idCardImage: 'data:image/png;base64,AA', passportPhotoImage: 'data:image/png;base64,AA' } })
    await prisma.verification.create({ data: { userId: other.userId, idCardImage: 'data:image/png;base64,AA', passportPhotoImage: 'data:image/png;base64,AA' } })
    // Vrai prestataire dans un secteur SANS fiche de démo → seul candidat.
    await providerProfileService.upsertProviderProfile(provider.userId, { displayName: 'Presta Santé', sector: 'sante', city: 'Lomé', rateFrom: 4000, payoutMethod: 'flooz' })
  })

  afterAll(async () => {
    const ids = [client.userId, unverified.userId, provider.userId, other.userId]
    await prisma.verification.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  const validBody = { title: 'Ménage hebdo', skills: ['Ménage à domicile'], description: 'Appartement 3 pièces', budgetMax: 5000, urgency: 'flexible', location: 'Lomé', sector: 'menage' }

  describe('POST /requests', () => {
    it('sans session → 401', async () => {
      expect((await request(app).post('/api/requests').send(validBody)).status).toBe(401)
    })

    it('mauvais rôle (prestataire) → 403', async () => {
      expect((await request(app).post('/api/requests').set('Cookie', provider.cookie).send(validBody)).status).toBe(403)
    })

    it('client non vérifié → 403', async () => {
      expect((await request(app).post('/api/requests').set('Cookie', unverified.cookie).send(validBody)).status).toBe(403)
    })

    it('corps invalide (sans compétence) → 400', async () => {
      const res = await request(app).post('/api/requests').set('Cookie', client.cookie).send({ ...validBody, skills: [] })
      expect(res.status).toBe(400)
    })

    it('client vérifié → 201 + demande + top de correspondances (démo)', async () => {
      const res = await request(app).post('/api/requests').set('Cookie', client.cookie).send(validBody)
      expect(res.status).toBe(201)
      expect(res.body.request).toMatchObject({ userId: client.userId, title: 'Ménage hebdo', urgency: 'flexible' })
      expect(Array.isArray(res.body.matches)).toBe(true)
      expect(res.body.matches.length).toBeGreaterThan(0)
      expect(res.body.matches[0]).toHaveProperty('score.total')
    })
  })

  describe('lecture des demandes', () => {
    let requestId = ''

    beforeAll(async () => {
      const res = await request(app).post('/api/requests').set('Cookie', client.cookie).send(validBody)
      requestId = res.body.request.id
    })

    it('GET /requests → liste du client (rôle client requis)', async () => {
      expect((await request(app).get('/api/requests').set('Cookie', provider.cookie)).status).toBe(403)
      const res = await request(app).get('/api/requests').set('Cookie', client.cookie)
      expect(res.status).toBe(200)
      expect(res.body.requests.some((r: { id: string }) => r.id === requestId)).toBe(true)
    })

    it('GET /requests/:id → titulaire uniquement (404 sinon)', async () => {
      const ok = await request(app).get(`/api/requests/${requestId}`).set('Cookie', client.cookie)
      expect(ok.status).toBe(200)
      expect(ok.body.request.id).toBe(requestId)

      const forbidden = await request(app).get(`/api/requests/${requestId}`).set('Cookie', other.cookie)
      expect(forbidden.status).toBe(404)
    })

    it('GET /requests/:id/matches?limit=3 → recalcul borné à 3', async () => {
      const res = await request(app).get(`/api/requests/${requestId}/matches?limit=3`).set('Cookie', client.cookie)
      expect(res.status).toBe(200)
      expect(res.body.matches.length).toBeLessThanOrEqual(3)
    })
  })

  describe('GET /requests/received (prestataire)', () => {
    it('mauvais rôle (client) → 403', async () => {
      expect((await request(app).get('/api/requests/received').set('Cookie', client.cookie)).status).toBe(403)
    })

    it('le prestataire voit une demande où il est matché', async () => {
      // Demande dans un secteur sans démo → le vrai prestataire est le seul candidat.
      await request(app).post('/api/requests').set('Cookie', client.cookie).send({ title: 'Soins à domicile', skills: ['Aide-soignant'], budgetMax: 8000, urgency: 'semaine', location: 'Lomé', sector: 'sante' })

      const res = await request(app).get('/api/requests/received').set('Cookie', provider.cookie)
      expect(res.status).toBe(200)
      expect(res.body.matches.length).toBeGreaterThan(0)
      expect(res.body.matches[0].request.sector).toBe('sante')
    })
  })
})
