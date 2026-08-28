import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du calendrier de disponibilité (#290) porté vers Express (ADR-0016) :
 * réservé au **rôle prestataire** (401/403), dates validées (400), création (201),
 * suppression (404 si inconnue). Base de test ISOLÉE.
 */
describe('Contrat — disponibilité prestataire (/api/providers/availability)', () => {
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
    await prisma.unavailabilityPeriod.deleteMany({ where: { providerId: provider.userId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
  })

  const asProvider = (r: request.Test) => r.set('Cookie', `wt_session=${provider.token}`)

  it('sans session → 401 ; avec un client → 403', async () => {
    expect((await request(app).get('/api/providers/availability')).status).toBe(401)
    const client403 = await request(app).get('/api/providers/availability').set('Cookie', `wt_session=${client.token}`)
    expect(client403.status).toBe(403)
    expect(client403.body.message).toBe('Réservé aux comptes prestataire.')
  })

  it('POST dates invalides → 400 (messages iso)', async () => {
    const badFormat = await asProvider(request(app).post('/api/providers/availability')).send({ startDate: '01/08/2026', endDate: '2026-08-05' })
    expect(badFormat.status).toBe(400)
    expect(badFormat.body.message).toBe('Format de date invalide (attendu : AAAA-MM-JJ).')

    const badRange = await asProvider(request(app).post('/api/providers/availability')).send({ startDate: '2026-08-05', endDate: '2026-08-01' })
    expect(badRange.status).toBe(400)
    expect(badRange.body.message).toBe('La date de fin doit être postérieure ou égale à la date de début.')
  })

  it('POST valide → 201 { period } ; GET la retrouve ; DELETE puis 404', async () => {
    const created = await asProvider(request(app).post('/api/providers/availability')).send({ startDate: '2026-08-01', endDate: '2026-08-05' })
    expect(created.status).toBe(201)
    expect(created.body.period).toMatchObject({ providerId: provider.userId, startDate: '2026-08-01', endDate: '2026-08-05' })
    const periodId = created.body.period.id

    const list = await asProvider(request(app).get('/api/providers/availability'))
    expect(list.body.periods.map((p: { id: string }) => p.id)).toContain(periodId)

    const removed = await asProvider(request(app).delete(`/api/providers/availability/${periodId}`))
    expect(removed.status).toBe(200)
    expect(removed.body).toEqual({ ok: true })

    const removedAgain = await asProvider(request(app).delete(`/api/providers/availability/${periodId}`))
    expect(removedAgain.status).toBe(404)
  })

  it('un prestataire ne peut pas supprimer la période d’un autre (isolation)', async () => {
    const created = await asProvider(request(app).post('/api/providers/availability')).send({ startDate: '2026-09-01', endDate: '2026-09-02' })
    const otherProvider = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `o${randomUUID().slice(0, 8)}` } })
    const otherToken = randomUUID()
    await prisma.session.create({ data: { token: otherToken, userId: otherProvider.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    try {
      const res = await request(app).delete(`/api/providers/availability/${created.body.period.id}`).set('Cookie', `wt_session=${otherToken}`)
      expect(res.status).toBe(404)
    } finally {
      await prisma.session.deleteMany({ where: { userId: otherProvider.id } }).catch(() => undefined)
      await prisma.user.deleteMany({ where: { id: otherProvider.id } }).catch(() => undefined)
    }
  })
})
