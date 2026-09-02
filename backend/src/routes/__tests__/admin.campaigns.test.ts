import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'
import { hashPassword } from '../../utils/password'

/**
 * Contrat du module admin 11 — campagnes de notification. Portées iso depuis
 * `server/api/admin/campaigns/**` (ADR-0017) : historique et création (envoi
 * immédiat in-app ou programmée) ciblée sur un segment.
 */
describe('Contrat — admin campagnes (/api/admin/campaigns)', () => {
  const app = createServer()
  const suffix = randomUUID().slice(0, 8)
  const city = `Ville-${suffix}`
  const PASSWORD = 'secret123'
  const state = { superId: '', superToken: '', clientId: '', prestaId: '', campaignIds: [] as string[] }

  const authed = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD)
    const superAdmin = await prisma.user.create({ data: { contact: `super-${suffix}@test.tg`, role: 'admin', passwordHash: hash, adminPermissions: null, username: `sup${suffix}`, firstName: 'S', lastName: 'A' } })
    state.superId = superAdmin.id
    const client = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', status: 'active', location: city, username: `cli${suffix}` } })
    state.clientId = client.id
    const presta = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'prestataire', status: 'active', location: city, username: `pro${suffix}` } })
    state.prestaId = presta.id

    const token = randomUUID()
    await prisma.session.create({ data: { token, userId: superAdmin.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    state.superToken = token
  })

  afterAll(async () => {
    const userIds = [state.superId, state.clientId, state.prestaId]
    if (state.campaignIds.length) await prisma.notificationCampaign.deleteMany({ where: { id: { in: state.campaignIds } } }).catch(() => undefined)
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  })

  it('GET → 200, liste des campagnes', async () => {
    const res = await request(app).get('/api/admin/campaigns').set(authed(state.superToken))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.campaigns)).toBe(true)
  })

  it('POST message manquant → 400', async () => {
    expect((await request(app).post('/api/admin/campaigns').set(authed(state.superToken)).send({ channel: 'in_app' })).status).toBe(400)
  })

  it('POST in-app ciblé → 200, notifications envoyées au segment', async () => {
    const res = await request(app).post('/api/admin/campaigns').set(authed(state.superToken)).send({ city, channel: 'in_app', subject: 'Promo', body: 'Offre du mois' })
    expect(res.status).toBe(200)
    state.campaignIds.push(res.body.campaign.id)
    expect(res.body.campaign.recipientCount).toBe(2)
    expect(res.body.campaign.sentAt).toBeTruthy()
    expect(res.body.campaign.scheduledAt).toBeNull()
    const notifs = await prisma.notification.count({ where: { userId: { in: [state.clientId, state.prestaId] }, type: 'admin_message', title: 'Promo' } })
    expect(notifs).toBe(2)
  })

  it('POST programmée → 200, scheduledAt posé, aucun envoi', async () => {
    const before = await prisma.notification.count({ where: { userId: { in: [state.clientId, state.prestaId] } } })
    const res = await request(app).post('/api/admin/campaigns').set(authed(state.superToken)).send({ city, channel: 'in_app', body: 'Plus tard', scheduledAt: Date.now() + 86_400_000 })
    expect(res.status).toBe(200)
    state.campaignIds.push(res.body.campaign.id)
    expect(res.body.campaign.scheduledAt).toBeTruthy()
    expect(res.body.campaign.sentAt).toBeNull()
    expect(res.body.campaign.recipientCount).toBe(2)
    const after = await prisma.notification.count({ where: { userId: { in: [state.clientId, state.prestaId] } } })
    expect(after).toBe(before)
  })
})
