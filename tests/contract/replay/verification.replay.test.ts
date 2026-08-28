// @vitest-environment node
//
// Rejeu de contrat « vérification d'identité » : mêmes requêtes vers Nitro
// (`server/api/verification/*`) et Express (`backend/.../verification.routes.ts`),
// même base (ADR-0016). Le POST est un `upsert` sur une clé partagée (userId) →
// rejeu **séquentiel** (sinon les deux upserts se courent après). `submittedAt`
// est généré à l'écriture → neutralisé pour la comparaison de forme.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import verificationMe from '~~/server/api/verification/me.get'
import verificationPost from '~~/server/api/verification/index.post'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope, stripTopLevel } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let cookie: string
let userId: string

const IMAGE = `data:image/png;base64,${'A'.repeat(200)}`
// `submittedAt` est posé à `Date.now()` à l'écriture → diffère entre les deux
// upserts (nitro puis express). La forme du reste de la réponse doit être iso.
const normalizeSubmittedAt = stripTopLevel(['submittedAt'])

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/verification/me', handler: verificationMe },
    { method: 'post', path: '/api/verification', handler: verificationPost },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('client')
  cookie = authed.cookieHeader
  userId = authed.user.id
}, 30_000)

afterAll(async () => {
  await prisma.verification.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — vérification d\'identité', () => {
  it('GET sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/verification/me' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET avant soumission → { verified: false, submittedAt: null } iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/verification/me', headers: { cookie } })
    expect(n.body).toEqual({ verified: false, submittedAt: null })
  })

  it.each([
    { idCardImage: 'nope', passportPhotoImage: IMAGE },
    { idCardImage: IMAGE, passportPhotoImage: 'nope' },
    { passportPhotoImage: IMAGE },
  ])('POST pièces invalides → 400 iso : %o', async (body) => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/verification', headers: { cookie }, body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })

  it('POST valide → { verified: true, submittedAt } iso (upsert séquentiel)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/verification', headers: { cookie }, body: { idCardImage: IMAGE, passportPhotoImage: IMAGE } },
      normalizeSubmittedAt,
      { sequential: true },
    )
    expect((n.body as { verified: boolean }).verified).toBe(true)

    // Après soumission, le GET reflète le statut des deux côtés (row partagée).
    const { nitro: g } = await expectIso(targets, { path: '/api/verification/me', headers: { cookie } }, normalizeSubmittedAt)
    expect((g.body as { verified: boolean }).verified).toBe(true)
  })
})
