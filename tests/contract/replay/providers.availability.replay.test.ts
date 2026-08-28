// @vitest-environment node
//
// Rejeu de contrat « disponibilité prestataire » (#290) : mêmes requêtes vers
// Nitro (`server/api/providers/availability*`) et Express, même base (ADR-0016).
// Réservé au rôle prestataire (401/403). Première tranche du domaine `providers`
// portée (le store de disponibilité vient d'être persisté en base).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import availabilityGet from '~~/server/api/providers/availability.get'
import availabilityPost from '~~/server/api/providers/availability.post'
import availabilityDelete from '~~/server/api/providers/availability/[id].delete'
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

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/providers/availability', handler: availabilityGet },
    { method: 'post', path: '/api/providers/availability', handler: availabilityPost },
    { method: 'delete', path: '/api/providers/availability/:id', handler: availabilityDelete },
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
  await prisma.unavailabilityPeriod.deleteMany({ where: { providerId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — disponibilité prestataire', () => {
  it('GET sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/providers/availability' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET avec un client → 403 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/providers/availability', headers: { cookie: clientCookie } }, normalizeErrorEnvelope())
    expect(n.status).toBe(403)
  })

  it.each([
    { startDate: '01/08/2026', endDate: '2026-08-05' },
    { startDate: '2026-08-05', endDate: '2026-08-01' },
  ])('POST dates invalides → 400 iso : %o', async (body) => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/providers/availability', headers: { cookie: providerCookie }, body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })

  it('POST valide → 201 { period } iso (hors id/createdAt générés)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/providers/availability', headers: { cookie: providerCookie }, body: { startDate: '2026-08-01', endDate: '2026-08-05' } },
      stripGenerated('period', ['id', 'createdAt']),
    )
    expect(n.status).toBe(201)
    expect((n.body as { period: { providerId: string } }).period.providerId).toBe(providerId)
  })

  it('GET (prestataire) → { periods } iso', async () => {
    // Les deux runtimes lisent la même base (les 2 périodes créées ci-dessus) → identiques.
    const { nitro: n } = await expectIso(targets, { path: '/api/providers/availability', headers: { cookie: providerCookie } })
    expect((n.body as { periods: unknown[] }).periods.length).toBeGreaterThanOrEqual(2)
  })

  it('DELETE d’un id inconnu → 404 iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'DELETE', path: '/api/providers/availability/id-inexistant', headers: { cookie: providerCookie } },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(404)
  })
})
