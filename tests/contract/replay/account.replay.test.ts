// @vitest-environment node
//
// Rejeu de contrat « compte RGPD » : mêmes requêtes vers Nitro
// (`server/api/account/*`) et Express (`backend/.../account.routes.ts`), même
// base (ADR-0016). L'export est une lecture pure (rejeu parallèle) ; l'effacement
// détruit la session — chaque runtime est donc piloté avec SON propre compte,
// puis les réponses sont comparées.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import accountExport from '~~/server/api/account/export.get'
import accountDelete from '~~/server/api/account/delete.post'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { callServer, expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope, stripTopLevel } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let cookie: string
let userId: string

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/account/export', handler: accountExport },
    { method: 'post', path: '/api/account/delete', handler: accountDelete },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('client')
  cookie = authed.cookieHeader
  userId = authed.user.id
  // État identique lu par les deux runtimes : une vérification + un mouvement.
  await prisma.verification.create({ data: { userId, idCardImage: 'data:image/png;base64,AAAA', passportPhotoImage: 'data:image/png;base64,AAAA' } })
  await prisma.walletMovement.create({ data: { walletUserId: userId, type: 'recharge', amount: 3000, reference: `ref-${userId}` } })
}, 30_000)

afterAll(async () => {
  await prisma.walletMovement.deleteMany({ where: { walletUserId: userId } }).catch(() => undefined)
  await prisma.verification.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — compte RGPD', () => {
  it('GET /account/export sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/account/export' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET /account/export (session) → iso (hors exportedAt généré)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { path: '/api/account/export', headers: { cookie } },
      stripTopLevel(['exportedAt']),
    )
    const body = n.body as { walletBalance: number; verification: unknown }
    expect(body.walletBalance).toBe(3000)
    expect(body.verification).toEqual({ submittedAt: expect.any(Number), purgedAt: null })
  })

  it('POST /account/delete → { ok: true } iso (chaque runtime sur son propre compte)', async () => {
    // Compte dédié par runtime : l'effacement anonymise et détruit la session,
    // donc on ne peut pas rejouer la MÊME requête aux deux (le 2e serait 401).
    const a = await createAuthedUser('client')
    const b = await createAuthedUser('client')
    try {
      const nRes = await callServer(targets.nitroUrl, { method: 'POST', path: '/api/account/delete', headers: { cookie: a.cookieHeader } })
      const eRes = await callServer(targets.expressUrl, { method: 'POST', path: '/api/account/delete', headers: { cookie: b.cookieHeader } })

      expect(nRes.status).toBe(200)
      expect(eRes).toEqual(nRes) // même statut ET même corps { ok: true }

      // Effet réel identique : comptes anonymisés, sessions supprimées.
      for (const id of [a.user.id, b.user.id]) {
        const row = await prisma.user.findUnique({ where: { id } })
        expect(row?.lastName).toBe('Compte supprimé')
        expect(await prisma.session.count({ where: { userId: id } })).toBe(0)
      }
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: [a.user.id, b.user.id] } } }).catch(() => undefined)
    }
  })
})
