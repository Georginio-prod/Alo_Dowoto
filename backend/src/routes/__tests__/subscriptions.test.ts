import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « abonnements » porté vers Express (Phase 2, ADR-0016) :
 * réservé au **rôle prestataire** (401/403), formule validée (400), création en
 * attente, conflit si actif, essai gratuit réservé à la 1re souscription.
 * Base de test ISOLÉE.
 */
describe('Contrat — abonnements (/api/subscriptions)', () => {
  const app = createServer()
  const provider = { userId: '', token: '' }
  const client = { userId: '', token: '' }

  beforeAll(async () => {
    const p = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `p${randomUUID().slice(0, 8)}` } })
    provider.userId = p.id
    provider.token = randomUUID()
    await prisma.session.create({ data: { token: provider.token, userId: p.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const c = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${randomUUID().slice(0, 8)}` } })
    client.userId = c.id
    client.token = randomUUID()
    await prisma.session.create({ data: { token: client.token, userId: c.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  })

  afterAll(async () => {
    await prisma.subscription.deleteMany({ where: { userId: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
  })

  const asProvider = (r: request.Test) => r.set('Cookie', `wt_session=${provider.token}`)

  it('POST sans session → 401 ; avec un client → 403', async () => {
    expect((await request(app).post('/api/subscriptions').send({ plan: 'mensuel' })).status).toBe(401)
    const client403 = await request(app).post('/api/subscriptions').set('Cookie', `wt_session=${client.token}`).send({ plan: 'mensuel' })
    expect(client403.status).toBe(403)
    expect(client403.body.message).toBe('Réservé aux comptes prestataire.')
  })

  it('POST formule invalide → 400 « Formule invalide. »', async () => {
    const res = await asProvider(request(app).post('/api/subscriptions')).send({ plan: 'inconnue' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: true, statusCode: 400, message: 'Formule invalide.' })
  })

  it('POST valide → { subscription } en attente', async () => {
    const res = await asProvider(request(app).post('/api/subscriptions')).send({ plan: 'mensuel' })
    expect(res.status).toBe(200)
    expect(res.body.subscription).toMatchObject({ userId: provider.userId, plan: 'mensuel', status: 'en_attente', isTrial: false })
  })

  it('GET /me → l’abonnement courant', async () => {
    const res = await asProvider(request(app).get('/api/subscriptions/me'))
    expect(res.status).toBe(200)
    expect(res.body.subscription).toMatchObject({ userId: provider.userId, plan: 'mensuel' })
  })

  it('POST quand un abonnement ACTIF existe → 409', async () => {
    await prisma.subscription.updateMany({ where: { userId: provider.userId }, data: { status: 'actif' } })
    const res = await asProvider(request(app).post('/api/subscriptions')).send({ plan: 'annuel' })
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Un abonnement actif existe déjà.')
  })

  it('POST /trial refusé si un abonnement existe déjà → 409', async () => {
    const res = await asProvider(request(app).post('/api/subscriptions/trial')).send({ plan: 'mensuel' })
    expect(res.status).toBe(409)
    expect(res.body.message).toBe("L'essai gratuit n'est disponible qu'à la première souscription.")
  })

  it('POST /trial en 1re souscription → 201 { subscription } actif (isTrial)', async () => {
    // Compte prestataire neuf, sans aucun abonnement.
    const fresh = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `f${randomUUID().slice(0, 8)}` } })
    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: fresh.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    try {
      const res = await request(app).post('/api/subscriptions/trial').set('Cookie', `wt_session=${token}`).send({ plan: 'mensuel' })
      expect(res.status).toBe(201)
      expect(res.body.subscription).toMatchObject({ status: 'actif', isTrial: true, plan: 'mensuel' })
    } finally {
      await prisma.subscription.deleteMany({ where: { userId: fresh.id } }).catch(() => undefined)
      await prisma.session.deleteMany({ where: { userId: fresh.id } }).catch(() => undefined)
      await prisma.user.deleteMany({ where: { id: fresh.id } }).catch(() => undefined)
    }
  })
})
