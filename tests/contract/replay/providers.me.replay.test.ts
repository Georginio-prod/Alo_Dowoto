// @vitest-environment node
//
// Rejeu de contrat « profil prestataire » (#356) : mêmes requêtes vers Nitro
// (`server/api/providers/me*`) et Express, même compte (ADR-0016). Réservé au
// rôle prestataire (401/403).
//
// Note mémoire/DB : en test, la Nitro tient les profils en mémoire (Map) tandis
// que le backend lit la base. Le rejeu envoie donc le PATCH aux DEUX runtimes
// (chacun peuple son propre store) avant de comparer le GET ; `updatedAt` (Date
// de mise à jour) est neutralisé.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import meGet from '~~/server/api/providers/me.get'
import mePatch from '~~/server/api/providers/me.patch'
import mePositionDelete from '~~/server/api/providers/me/position.delete'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope, stripGenerated } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let providerCookie: string
let providerId: string
let clientCookie: string
const userIds: string[] = []

const normalizeProfile = stripGenerated('profile', ['updatedAt'])

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/providers/me', handler: meGet },
    { method: 'patch', path: '/api/providers/me', handler: mePatch },
    { method: 'delete', path: '/api/providers/me/position', handler: mePositionDelete },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const provider = await createAuthedUser('prestataire')
  providerCookie = provider.cookieHeader
  providerId = provider.user.id
  const client = await createAuthedUser('client')
  clientCookie = client.cookieHeader
  userIds.push(provider.user.id, client.user.id)
}, 30_000)

afterAll(async () => {
  await prisma.providerProfile.deleteMany({ where: { userId: providerId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — profil prestataire', () => {
  it('GET sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/providers/me' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET avec un client → 403 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/providers/me', headers: { cookie: clientCookie } }, normalizeErrorEnvelope())
    expect(n.status).toBe(403)
  })

  it.each([
    { body: { sector: 'digital', payoutMethod: 'flooz' }, label: 'sans localisation' },
    { body: { sector: 'inexistant', city: 'Lomé', payoutMethod: 'flooz' }, label: 'secteur invalide' },
  ])('PATCH invalide ($label) → 400 iso', async ({ body }) => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'PATCH', path: '/api/providers/me', headers: { cookie: providerCookie }, body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })

  it('PATCH valide → { profile } iso (hors updatedAt)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      {
        method: 'PATCH',
        path: '/api/providers/me',
        headers: { cookie: providerCookie },
        body: { sector: 'digital', city: 'Lomé', payoutMethod: 'flooz', latitude: 6.1319, longitude: 1.2228, description: 'Dev web', rateFrom: 5000, languages: ['Français'] },
      },
      normalizeProfile,
    )
    expect((n.body as { profile: { userId: string } }).profile.userId).toBe(providerId)
  })

  it('GET (prestataire) → { profile } iso (hors updatedAt)', async () => {
    // Les deux runtimes ont reçu le PATCH ci-dessus → chacun renvoie le profil.
    const { nitro: n } = await expectIso(targets, { path: '/api/providers/me', headers: { cookie: providerCookie } }, normalizeProfile)
    expect((n.body as { profile: { sector: string } }).profile.sector).toBe('digital')
  })

  it('DELETE /me/position → { profile } iso (position effacée, hors updatedAt)', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'DELETE', path: '/api/providers/me/position', headers: { cookie: providerCookie } }, normalizeProfile)
    expect((n.body as { profile: { latitude?: number } }).profile.latitude).toBeUndefined()
  })
})
