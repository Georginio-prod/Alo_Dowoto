import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../config/prisma'
import { createServer } from '../../config/server'

/**
 * Contrat du domaine « notifications » porté vers Express (Phase 2, ADR-0016) :
 * réservé à un utilisateur connecté (401 sinon), 30 plus récentes + compteur de
 * non-lues, marquage global comme lu. Base de test ISOLÉE.
 */
describe('Contrat — notifications (/api/notifications)', () => {
  const app = createServer()
  const state = { userId: '', token: '' }

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `u${randomUUID().slice(0, 8)}` } })
    state.userId = u.id
    state.token = randomUUID()
    await prisma.session.create({ data: { token: state.token, userId: u.id, expiresAt: new Date(Date.now() + 3_600_000) } })
    await prisma.notification.createMany({
      data: [
        { userId: u.id, type: 'new_message', title: 'A', body: 'Non lue', readAt: null },
        { userId: u.id, type: 'new_message', title: 'B', body: 'Déjà lue', readAt: new Date() },
      ],
    })
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.session.deleteMany({ where: { userId: state.userId } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: state.userId } }).catch(() => undefined)
  })

  const cookie = () => `wt_session=${state.token}`

  it('GET sans session → 401', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: true, statusCode: 401, message: 'Non connecté.' })
  })

  it('GET → { notifications, unreadCount } (plus récentes d’abord, 1 non-lue)', async () => {
    const res = await request(app).get('/api/notifications').set('Cookie', cookie())
    expect(res.status).toBe(200)
    expect(res.body.notifications.length).toBe(2)
    expect(res.body.unreadCount).toBe(1)
    const dates = res.body.notifications.map((n: { createdAt: number }) => n.createdAt)
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it('POST /read → { ok: true } puis compteur à 0', async () => {
    const res = await request(app).post('/api/notifications/read').set('Cookie', cookie())
    expect(res.body).toEqual({ ok: true })
    const after = await request(app).get('/api/notifications').set('Cookie', cookie())
    expect(after.body.unreadCount).toBe(0)
  })
})
