// @vitest-environment node
//
// Rejeu de contrat « notifications » : mêmes requêtes vers Nitro
// (`server/api/notifications/*`) et Express, même base (ADR-0016). Utilisateur
// connecté requis (401 sinon).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import notificationsGet from '~~/server/api/notifications/index.get'
import notificationsRead from '~~/server/api/notifications/read.post'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let cookie: string
let userId: string

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/notifications', handler: notificationsGet },
    { method: 'post', path: '/api/notifications/read', handler: notificationsRead },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('client')
  cookie = authed.cookieHeader
  userId = authed.user.id
  await prisma.notification.createMany({
    data: [
      { userId, type: 'new_message', title: 'Non lue', body: 'Message A', readAt: null },
      { userId, type: 'new_message', title: 'Lue', body: 'Message B', readAt: new Date() },
    ],
  })
}, 30_000)

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — notifications', () => {
  it('GET sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/notifications' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET (session) → { notifications, unreadCount } iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/notifications', headers: { cookie } })
    expect((n.body as { unreadCount: number }).unreadCount).toBe(1)
  })

  it('POST /read (session) → { ok: true } iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/notifications/read', headers: { cookie } },
    )
    expect(n.body).toEqual({ ok: true })
  })
})
