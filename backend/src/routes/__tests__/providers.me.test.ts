import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du profil prestataire (#356) porté vers Express (ADR-0016) : réservé au
 * **rôle prestataire** (401/403), secteur + onboarding obligatoires (400), lecture/
 * mise à jour de la fiche, suppression de la position. Base de test ISOLÉE.
 */
describe('Contrat — profil prestataire (/api/providers/me)', () => {
  const app = createServer()
  const provider = { userId: '', token: '', username: '' }
  const client = { userId: '', token: '' }

  beforeAll(async () => {
    const username = `p${randomUUID().slice(0, 8)}`
    const p = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username } })
    provider.userId = p.id
    provider.username = username
    provider.token = randomUUID()
    await prisma.session.create({ data: { token: provider.token, userId: p.id, expiresAt: new Date(Date.now() + 3_600_000) } })

    const c = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `c${randomUUID().slice(0, 8)}` } })
    client.userId = c.id
    client.token = randomUUID()
    await prisma.session.create({ data: { token: client.token, userId: c.id, expiresAt: new Date(Date.now() + 3_600_000) } })
  })

  afterAll(async () => {
    await prisma.providerProfile.deleteMany({ where: { userId: provider.userId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: [provider.userId, client.userId] } } }).catch(() => undefined)
  })

  const asProvider = (r: request.Test) => r.set('Cookie', `wt_session=${provider.token}`)

  it('sans session → 401 ; avec un client → 403', async () => {
    expect((await request(app).get('/api/providers/me')).status).toBe(401)
    const c = await request(app).get('/api/providers/me').set('Cookie', `wt_session=${client.token}`)
    expect(c.status).toBe(403)
    expect(c.body.message).toBe('Réservé aux comptes prestataire.')
  })

  it('GET sans profil → { profile: null }', async () => {
    const res = await asProvider(request(app).get('/api/providers/me'))
    expect(res.status).toBe(200)
    expect(res.body.profile).toBeNull()
  })

  it('PATCH sans localisation → 400', async () => {
    const res = await asProvider(request(app).patch('/api/providers/me')).send({ sector: 'digital', payoutMethod: 'flooz' })
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('La localisation est obligatoire.')
  })

  it('PATCH secteur invalide → 400 (validation schéma)', async () => {
    const res = await asProvider(request(app).patch('/api/providers/me')).send({ sector: 'inexistant', city: 'Lomé', payoutMethod: 'flooz' })
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Secteur invalide.')
  })

  it('PATCH valide → 200 { profile } et persistance (GET la relit)', async () => {
    const res = await asProvider(request(app).patch('/api/providers/me')).send({
      sector: 'digital', city: 'Lomé', payoutMethod: 'flooz', latitude: 6.1319, longitude: 1.2228,
      description: 'Développeur web', rateFrom: 5000, languages: ['Français', 'Éwé'],
    })
    expect(res.status).toBe(200)
    expect(res.body.profile).toMatchObject({ userId: provider.userId, sector: 'digital', city: 'Lomé', payoutMethod: 'flooz', displayName: provider.username })
    expect(res.body.profile.languages).toEqual(['Français', 'Éwé'])

    const reread = await asProvider(request(app).get('/api/providers/me'))
    expect(reread.body.profile).toMatchObject({ sector: 'digital', city: 'Lomé', latitude: 6.1319, longitude: 1.2228 })
    expect(reread.body.profile.languages).toEqual(['Français', 'Éwé'])
  })

  it('DELETE /me/position → efface lat/lng, conserve city', async () => {
    const res = await asProvider(request(app).delete('/api/providers/me/position'))
    expect(res.status).toBe(200)
    expect(res.body.profile.latitude).toBeUndefined()
    expect(res.body.profile.longitude).toBeUndefined()
    expect(res.body.profile.city).toBe('Lomé')

    const reread = await asProvider(request(app).get('/api/providers/me'))
    expect(reread.body.profile.latitude).toBeUndefined()
  })
})
