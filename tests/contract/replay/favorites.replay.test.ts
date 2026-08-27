// @vitest-environment node
//
// Rejeu de contrat du domaine « favoris » : mêmes requêtes envoyées à Nitro
// (`server/api/favorites/*`) et à Express (`backend/src/routes/favorites.routes.ts`),
// même base (ADR-0016). Exerce le cas nouveau d'**auth obligatoire + rôle** :
// 401 sans session, 403 avec le mauvais rôle, 201/200 en client authentifié.
// (GET /api/favorites non porté — enrichissement annuaire différé.)
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import favoritesPost from '~~/server/api/favorites/index.post'
import favoritesDelete from '~~/server/api/favorites/[providerId].delete'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope, stripGenerated } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let clientCookie: string
let clientId: string
let providerCookie: string
const userIds: string[] = []
const PROVIDER_ID = `__replay_prov_${randomUUID()}`

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'post', path: '/api/favorites', handler: favoritesPost },
    { method: 'delete', path: '/api/favorites/:providerId', handler: favoritesDelete },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const client = await createAuthedUser('client')
  clientCookie = client.cookieHeader
  clientId = client.user.id
  const provider = await createAuthedUser('prestataire')
  providerCookie = provider.cookieHeader
  userIds.push(client.user.id, provider.user.id)
}, 30_000)

afterAll(async () => {
  await prisma.favorite.deleteMany({ where: { clientId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — auth obligatoire (rôle client)', () => {
  it('POST sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/favorites', body: { providerId: PROVIDER_ID } },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(401)
  })

  it('DELETE sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'DELETE', path: `/api/favorites/${PROVIDER_ID}` },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(401)
  })

  it('POST avec un compte prestataire → 403 iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/favorites', headers: { cookie: providerCookie }, body: { providerId: PROVIDER_ID } },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(403)
  })

  it('POST corps invalide (client) → 400 iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/favorites', headers: { cookie: clientCookie }, body: { providerId: '   ' } },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })
})

describe('Rejeu de contrat — client authentifié', () => {
  // Les deux upsert la MÊME ligne (clé composite) : `createdAt` neutralisé par
  // prudence (races), le reste (`clientId`, `providerId`) doit être iso.
  const normalizeFavorite = stripGenerated('favorite', ['createdAt'])

  it('POST → 201 { favorite } iso (compte client rattaché des deux côtés)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/favorites', headers: { cookie: clientCookie }, body: { providerId: PROVIDER_ID } },
      normalizeFavorite,
      { sequential: true }, // upsert sur clé partagée : cf. ReplayOptions.sequential
    )
    expect(n.status).toBe(201)
    expect((n.body as { favorite: { clientId: string } }).favorite.clientId).toBe(clientId)
  })

  it('DELETE → { ok: true } iso (idempotent)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'DELETE', path: `/api/favorites/${PROVIDER_ID}`, headers: { cookie: clientCookie } },
    )
    expect(n.body).toEqual({ ok: true })
  })
})
