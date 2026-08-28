// @vitest-environment node
//
// Rejeu de contrat « notations reçues » : mêmes requêtes vers Nitro
// (`server/api/reviews/me.get`) et Express (`backend/.../reviews.routes.ts`),
// même base (ADR-0016). Lecture pure et déterministe (moyenne/nombre d'avis
// reçus) → comparaison directe, sans normalisation.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import reviewsMe from '~~/server/api/reviews/me.get'
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
    { method: 'get', path: '/api/reviews/me', handler: reviewsMe },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('prestataire')
  cookie = authed.cookieHeader
  userId = authed.user.id
  // Deux avis reçus (4 et 5) → moyenne 4.5, count 2, identiques des deux côtés.
  await prisma.review.create({ data: { conversationId: `c-${randomUUID()}`, authorId: `a-${randomUUID()}`, targetId: userId, rating: 4 } })
  await prisma.review.create({ data: { conversationId: `c-${randomUUID()}`, authorId: `a-${randomUUID()}`, targetId: userId, rating: 5 } })
}, 30_000)

afterAll(async () => {
  await prisma.review.deleteMany({ where: { targetId: userId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — notations reçues', () => {
  it('GET sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/reviews/me' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET (session) → { rating: { average, count } } iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/reviews/me', headers: { cookie } })
    expect(n.body).toEqual({ rating: { average: 4.5, count: 2 } })
  })
})
