import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « favoris » porté vers Express (Phase 2, ADR-0016) :
 * réservé au **rôle client** (401 sans session, 403 si mauvais rôle — mêmes
 * codes/messages que Nitro), ajout/retrait **idempotents**, validation iso,
 * liste enrichie de la fiche annuaire (`provider: null` si hors annuaire).
 *
 * Base de test ISOLÉE (globalSetup). Comptes/favoris créés puis nettoyés.
 */
describe('Contrat — favoris (/api/favorites)', () => {
  const app = createServer()
  const client = { userId: '', token: '' }
  const provider = { userId: '', token: '' }
  const PROVIDER_ID = `prov-${randomUUID()}`

  beforeAll(async () => {
    const c = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${randomUUID().slice(0, 8)}` } })
    client.userId = c.id
    client.token = randomUUID()
    await prisma.session.create({ data: { token: client.token, userId: c.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const p = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `p${randomUUID().slice(0, 8)}` } })
    provider.userId = p.id
    provider.token = randomUUID()
    await prisma.session.create({ data: { token: provider.token, userId: p.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  })

  afterAll(async () => {
    await prisma.favorite.deleteMany({ where: { clientId: { in: [client.userId, provider.userId] } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: [client.userId, provider.userId] } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: [client.userId, provider.userId] } } }).catch(() => undefined)
  })

  const asClient = (r: request.Test) => r.set('Cookie', `wt_session=${client.token}`)

  describe('Auth requise (rôle client)', () => {
    it('POST sans session → 401 « Non connecté. »', async () => {
      const res = await request(app).post('/api/favorites').send({ providerId: PROVIDER_ID })
      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({ error: true, statusCode: 401, message: 'Non connecté.' })
    })

    it('DELETE sans session → 401', async () => {
      const res = await request(app).delete(`/api/favorites/${PROVIDER_ID}`)
      expect(res.status).toBe(401)
    })

    it('POST avec un compte prestataire → 403 « Réservé aux comptes client. »', async () => {
      const res = await request(app).post('/api/favorites').set('Cookie', `wt_session=${provider.token}`).send({ providerId: PROVIDER_ID })
      expect(res.status).toBe(403)
      expect(res.body).toMatchObject({ error: true, statusCode: 403, message: 'Réservé aux comptes client.' })
    })
  })

  describe('Client authentifié', () => {
    it('POST → 201 { favorite } et ajout idempotent (createdAt stable)', async () => {
      const first = await asClient(request(app).post('/api/favorites')).send({ providerId: PROVIDER_ID })
      expect(first.status).toBe(201)
      expect(first.body.favorite).toMatchObject({ clientId: client.userId, providerId: PROVIDER_ID })
      expect(typeof first.body.favorite.createdAt).toBe('number')

      const second = await asClient(request(app).post('/api/favorites')).send({ providerId: PROVIDER_ID })
      expect(second.status).toBe(201)
      expect(second.body.favorite.createdAt).toBe(first.body.favorite.createdAt)
    })

    it('DELETE → { ok: true }, puis idempotent (retrait d’un favori absent OK)', async () => {
      const res = await asClient(request(app).delete(`/api/favorites/${PROVIDER_ID}`))
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })

      const again = await asClient(request(app).delete(`/api/favorites/${PROVIDER_ID}`))
      expect(again.status).toBe(200)
      expect(again.body).toEqual({ ok: true })
    })

    it('POST providerId vide → 400 (message iso)', async () => {
      const res = await asClient(request(app).post('/api/favorites')).send({ providerId: '   ' })
      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: true, statusCode: 400, message: "L'identifiant du prestataire est requis." })
    })
  })

  describe('GET /api/favorites', () => {
    it('sans session → 401', async () => {
      expect((await request(app).get('/api/favorites')).status).toBe(401)
    })

    it('compte prestataire → 403', async () => {
      const res = await request(app).get('/api/favorites').set('Cookie', `wt_session=${provider.token}`)
      expect(res.status).toBe(403)
    })

    it('client → 200 { favorites } enrichis (provider null hors annuaire)', async () => {
      await asClient(request(app).post('/api/favorites')).send({ providerId: PROVIDER_ID })
      const res = await asClient(request(app).get('/api/favorites'))
      expect(res.status).toBe(200)
      const item = res.body.favorites.find((f: { providerId: string }) => f.providerId === PROVIDER_ID)
      expect(item).toBeTruthy()
      expect(typeof item.createdAt).toBe('number')
      expect(item.provider).toBeNull()
    })
  })
})
