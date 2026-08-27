// @vitest-environment node
//
// Rejeu de contrat « abonnements » : mêmes requêtes vers Nitro
// (`server/api/subscriptions/*`) et Express, même base (ADR-0016). Réservé au
// rôle prestataire (401/403). La création est rejouée en **séquentiel** (un seul
// abonnement par compte : en parallèle, les deux `findFirst` ne se voient pas et
// créeraient deux lignes).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import subscriptionsPost from '~~/server/api/subscriptions/index.post'
import subscriptionsMe from '~~/server/api/subscriptions/me.get'
import subscriptionsTrial from '~~/server/api/subscriptions/trial.post'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let providerCookie: string
let providerId: string
let clientCookie: string
const userIds: string[] = []

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'post', path: '/api/subscriptions', handler: subscriptionsPost },
    { method: 'get', path: '/api/subscriptions/me', handler: subscriptionsMe },
    { method: 'post', path: '/api/subscriptions/trial', handler: subscriptionsTrial },
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
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — abonnements', () => {
  it('POST sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/subscriptions', body: { plan: 'mensuel' } }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('POST avec un client → 403 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/subscriptions', headers: { cookie: clientCookie }, body: { plan: 'mensuel' } }, normalizeErrorEnvelope())
    expect(n.status).toBe(403)
  })

  it('POST formule invalide → 400 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/subscriptions', headers: { cookie: providerCookie }, body: { plan: 'inconnue' } }, normalizeErrorEnvelope())
    expect(n.status).toBe(400)
  })

  it('POST valide (prestataire) → { subscription } iso', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/subscriptions', headers: { cookie: providerCookie }, body: { plan: 'mensuel' } },
      (r) => r,
      { sequential: true }, // un seul abonnement par compte : cf. ReplayOptions.sequential
    )
    expect(n.status).toBe(200)
    expect((n.body as { subscription: { userId: string } }).subscription.userId).toBe(providerId)
  })

  it('GET /me → { subscription } iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/subscriptions/me', headers: { cookie: providerCookie } })
    expect((n.body as { subscription: { plan: string } }).subscription.plan).toBe('mensuel')
  })

  it('POST /trial refusé (abonnement déjà existant) → 409 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/subscriptions/trial', headers: { cookie: providerCookie }, body: { plan: 'mensuel' } }, normalizeErrorEnvelope())
    expect(n.status).toBe(409)
  })
})
