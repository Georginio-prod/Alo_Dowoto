// @vitest-environment node
//
// Rejeu de contrat « parrainage » : mêmes requêtes vers Nitro
// (`server/api/referrals/me.get`) et Express, même base (ADR-0016). Le code de
// parrainage est **pré-généré** dans le setup pour que les deux runtimes lisent
// le même (sinon chacun en générerait un aléatoire distinct).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import referralsMe from '~~/server/api/referrals/me.get'
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
let referredId: string

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/referrals/me', handler: referralsMe },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('client')
  cookie = authed.cookieHeader
  userId = authed.user.id
  // Code pré-généré → déterministe et identique des deux côtés.
  await prisma.user.update({ where: { id: userId }, data: { referralCode: 'REPLAY' } })

  const referred = await prisma.user.create({ data: { contact: `+228-${randomUUID()}`, role: 'client', username: `r${randomUUID().slice(0, 8)}`, firstName: 'Kofi', lastName: 'Mensah' } })
  referredId = referred.id
  await prisma.referral.create({ data: { referrerId: userId, referredId: referred.id, status: 'pending' } })
}, 30_000)

afterAll(async () => {
  await prisma.referral.deleteMany({ where: { referrerId: userId } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: [userId, referredId] } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — parrainage', () => {
  it('GET sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/referrals/me' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET (session) → code + bonus + filleul, iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/referrals/me', headers: { cookie } })
    const body = n.body as { referralCode: string; bonusAmount: number; referrals: unknown[] }
    expect(body.referralCode).toBe('REPLAY')
    expect(body.bonusAmount).toBe(500)
    expect(body.referrals).toHaveLength(1)
  })
})
