import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'
import { providerProfileService } from '../../services/providerProfileService'

/**
 * Contrat du module admin 2 — fiche & forçage prestataire. Portées iso depuis
 * `server/api/admin/providers/{[id].get,[id]/zone.patch,[id]/categories.patch}`
 * (ADR-0017).
 */
describe('Contrat — admin fiche prestataire (/api/admin/providers/:id)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const state = { superId: '', superToken: '', prestaWithProfile: '', prestaNoProfile: '', clientId: '' }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword('secret123')
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const p1 = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pw${suffix}`, firstName: 'Yao', lastName: 'M' } })
    state.prestaWithProfile = p1.id
    const p2 = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', username: `pn${suffix}` } })
    state.prestaNoProfile = p2.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `cli${suffix}` } })
    state.clientId = client.id

    await providerProfileService.upsertProviderProfile(p1.id, { displayName: 'Yao Plombier', sector: 'btp', city: 'Lomé' })

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    const ids = [state.superId, state.prestaWithProfile, state.prestaNoProfile, state.clientId]
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => undefined)
    await prisma.providerProfile.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  })

  it('fiche détaillée → 200 avec sections', async () => {
    const res = await request(app).get(`/api/admin/providers/${state.prestaWithProfile}`).set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(res.body.provider.user.id).toBe(state.prestaWithProfile)
    expect(res.body.provider.kyc).toHaveProperty('status')
    expect(Array.isArray(res.body.provider.missions)).toBe(true)
    expect(res.body.provider.profile.displayName).toBe('Yao Plombier')
  })

  it('fiche sur un chercheur → 404 « Prestataire introuvable. »', async () => {
    const res = await request(app).get(`/api/admin/providers/${state.clientId}`).set(authed(state.superToken))
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Prestataire introuvable.')
  })

  it('PATCH zone → 200, ville mise à jour', async () => {
    const res = await request(app).patch(`/api/admin/providers/${state.prestaWithProfile}/zone`).set(authed(state.superToken)).send({ city: 'Kara', rayonInterventionKm: 15 })
    expect(res.status).toBe(200)
    expect(res.body.profile.city).toBe('Kara')
    expect(res.body.profile.rayonInterventionKm).toBe(15)
  })

  it('PATCH zone sans profil → 404 « Profil prestataire introuvable. »', async () => {
    const res = await request(app).patch(`/api/admin/providers/${state.prestaNoProfile}/zone`).set(authed(state.superToken)).send({ city: 'Lomé' })
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Profil prestataire introuvable.')
  })

  it('PATCH categories → 200, secteur mis à jour', async () => {
    const res = await request(app).patch(`/api/admin/providers/${state.prestaWithProfile}/categories`).set(authed(state.superToken)).send({ sector: 'menage' })
    expect(res.status).toBe(200)
    expect(res.body.profile.sector).toBe('menage')
  })

  it('PATCH categories secteur manquant → 400', async () => {
    const res = await request(app).patch(`/api/admin/providers/${state.prestaWithProfile}/categories`).set(authed(state.superToken)).send({ sector: '   ' })
    expect(res.status).toBe(400)
  })
})
