// @vitest-environment node
//
// Rejeu de contrat « portefeuille » : mêmes requêtes vers Nitro
// (`server/api/wallet/**`) et Express (`backend/.../wallet.routes.ts`), même base
// (ADR-0016). Couvre le solde, la recharge (forme + validation), le gating du
// retrait, et le webhook opérateur (signature HMAC + anti-rejeu #355). Le webhook
// résout un `upsert`/statut sur une clé partagée → rejeu **séquentiel**.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import walletMe from '~~/server/api/wallet/me.get'
import walletRechargePost from '~~/server/api/wallet/recharge.post'
import walletRechargeGet from '~~/server/api/wallet/recharge/[id].get'
import walletWithdrawPost from '~~/server/api/wallet/withdraw.post'
import walletWebhookPost from '~~/server/api/wallet/webhook.post'
import { signWebhookBody } from '~~/server/utils/webhookSignature'
import { createAuthedUser } from '../../setup/httpAuth'
import type { TestServer } from '../../setup/httpTestApp'
import { startNitroServer } from './nitroServer'
import { startBackendServer, type BackendServer } from './backendApp'
import { expectIso, type ReplayTargets } from './replay'
import { normalizeErrorEnvelope, stripGenerated } from './normalize'

let nitro: TestServer
let express: BackendServer
let targets: ReplayTargets
let cookie: string
let userId: string
let crediteeId: string

const sig = (bodyObj: unknown) => ({ 'x-webhook-signature': signWebhookBody(JSON.stringify(bodyObj)) })

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'get', path: '/api/wallet/me', handler: walletMe },
    { method: 'post', path: '/api/wallet/recharge', handler: walletRechargePost },
    { method: 'get', path: '/api/wallet/recharge/:id', handler: walletRechargeGet },
    { method: 'post', path: '/api/wallet/withdraw', handler: walletWithdrawPost },
    { method: 'post', path: '/api/wallet/webhook', handler: walletWebhookPost },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const authed = await createAuthedUser('client')
  cookie = authed.cookieHeader
  userId = authed.user.id
  const creditee = await createAuthedUser('client')
  crediteeId = creditee.user.id
}, 30_000)

afterAll(async () => {
  const ids = [userId, crediteeId]
  await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: ids } } }).catch(() => undefined)
  await prisma.walletRecharge.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
  await prisma.webhookNonce.deleteMany({ where: { nonce: { startsWith: 'replay-' } } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — portefeuille', () => {
  it('GET /wallet/me sans session → 401 iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/wallet/me' }, normalizeErrorEnvelope())
    expect(n.status).toBe(401)
  })

  it('GET /wallet/me (session) → { balance: 0, movements: [], minWithdrawal: 5000 } iso', async () => {
    const { nitro: n } = await expectIso(targets, { path: '/api/wallet/me', headers: { cookie } })
    expect(n.body).toEqual({ balance: 0, movements: [], minWithdrawal: 5000 })
  })

  it.each([
    { provider: 'orange', phone: '90000000', amount: 1000 },
    { provider: 'flooz', phone: '90000000', amount: 100 },
    { provider: 'flooz', phone: '123', amount: 1000 },
  ])('POST /wallet/recharge corps invalide → 400 iso : %o', async (body) => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/wallet/recharge', headers: { cookie }, body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(400)
  })

  it('POST /wallet/recharge valide → { recharge } iso (hors id/createdAt générés)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/wallet/recharge', headers: { cookie }, body: { provider: 'tmoney', phone: '91234567', amount: 2000 } },
      stripGenerated('recharge', ['id', 'createdAt']),
    )
    expect((n.body as { recharge: { status: string } }).recharge.status).toBe('pending')
  })

  it('POST /wallet/withdraw sans session → 401 iso ; client → 403 iso', async () => {
    const a = await expectIso(targets, { method: 'POST', path: '/api/wallet/withdraw', body: { amount: 5000 } }, normalizeErrorEnvelope())
    expect(a.nitro.status).toBe(401)
    const b = await expectIso(targets, { method: 'POST', path: '/api/wallet/withdraw', headers: { cookie }, body: { amount: 5000 } }, normalizeErrorEnvelope())
    expect(b.nitro.status).toBe(403)
  })

  it('POST /wallet/webhook signature invalide → 401 iso', async () => {
    const body = { rechargeId: randomUUID(), status: 'success', timestamp: Date.now(), nonce: `replay-${randomUUID()}` }
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/wallet/webhook', headers: { 'x-webhook-signature': 'deadbeef' }, body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(401)
  })

  it('POST /wallet/webhook recharge inconnue → 404 iso', async () => {
    const body = { rechargeId: randomUUID(), status: 'success', timestamp: Date.now(), nonce: `replay-${randomUUID()}` }
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/wallet/webhook', headers: sig(body), body },
      normalizeErrorEnvelope(),
    )
    expect(n.status).toBe(404)
  })

  it('POST /wallet/webhook valide → recharge confirmée iso (séquentiel, 2e idempotent)', async () => {
    const recharge = await prisma.walletRecharge.create({ data: { userId: crediteeId, provider: 'flooz', phone: '+22890000000', amount: 4000 } })
    const body = { rechargeId: recharge.id, status: 'success', operatorRef: 'OP-REPLAY', timestamp: Date.now(), nonce: `replay-${randomUUID()}` }
    // 1er (Nitro) confirme et crédite ; 2e (Express) lit la même ligne résolue → iso.
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/wallet/webhook', headers: sig(body), body },
      stripGenerated('recharge', ['createdAt', 'resolvedAt']),
      { sequential: true },
    )
    expect((n.body as { recharge: { status: string } }).recharge.status).toBe('confirmed')
  })
})
