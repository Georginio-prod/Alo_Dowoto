// @vitest-environment node
//
// Rejeu de contrat « paiements » : mêmes requêtes vers Nitro
// (`server/api/payments/**`) et Express (`backend/.../payments.routes.ts`), même
// base (ADR-0016). Couvre l'initiation (validation + gating rôle/abonnement), la
// lecture, et le webhook opérateur (signature HMAC + anti-rejeu #355). Le webhook
// résout un statut partagé → rejeu **séquentiel**.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import paymentsInitiate from '~~/server/api/payments/initiate.post'
import paymentsMe from '~~/server/api/payments/me.get'
import paymentsGet from '~~/server/api/payments/[id].get'
import paymentsWebhook from '~~/server/api/payments/webhook.post'
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
const c: Record<string, string> = {}
const userIds: string[] = []
const subIds: string[] = []

const sig = (bodyObj: unknown) => ({ 'x-webhook-signature': signWebhookBody(JSON.stringify(bodyObj)) })

beforeAll(async () => {
  nitro = await startNitroServer([
    { method: 'post', path: '/api/payments/initiate', handler: paymentsInitiate },
    { method: 'get', path: '/api/payments/me', handler: paymentsMe },
    { method: 'get', path: '/api/payments/:id', handler: paymentsGet },
    { method: 'post', path: '/api/payments/webhook', handler: paymentsWebhook },
  ])
  express = await startBackendServer()
  targets = { nitroUrl: nitro.url, expressUrl: express.url }

  const client = await createAuthedUser('client'); userIds.push(client.user.id); c.client = client.cookieHeader
  const p = await createAuthedUser('prestataire'); userIds.push(p.user.id); c.p = p.cookieHeader
  const s1 = await prisma.subscription.create({ data: { userId: p.user.id, plan: 'mensuel', status: 'en_attente' } }); subIds.push(s1.id); c.subId = s1.id

  const pa = await createAuthedUser('prestataire'); userIds.push(pa.user.id); c.pa = pa.cookieHeader
  const s2 = await prisma.subscription.create({ data: { userId: pa.user.id, plan: 'mensuel', status: 'actif' } }); subIds.push(s2.id); c.activeSubId = s2.id

  const pm = await createAuthedUser('prestataire'); userIds.push(pm.user.id); c.pm = pm.cookieHeader
  const s3 = await prisma.subscription.create({ data: { userId: pm.user.id, plan: 'mensuel', status: 'en_attente' } }); subIds.push(s3.id)

  const pw = await createAuthedUser('prestataire'); userIds.push(pw.user.id)
  const s4 = await prisma.subscription.create({ data: { userId: pw.user.id, plan: 'trimestriel', status: 'en_attente' } }); subIds.push(s4.id); c.pwSubId = s4.id; c.pwId = pw.user.id
}, 30_000)

afterAll(async () => {
  await prisma.walletMovement.deleteMany({ where: { walletUserId: { in: userIds } } }).catch(() => undefined)
  await prisma.payment.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.subscription.deleteMany({ where: { id: { in: subIds } } }).catch(() => undefined)
  await prisma.webhookNonce.deleteMany({ where: { nonce: { startsWith: 'replay-' } } }).catch(() => undefined)
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined)
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined)
  await Promise.all([nitro?.close(), express?.close()])
})

describe('Rejeu de contrat — paiements', () => {
  it('POST /payments/initiate sans session → 401 iso ; client → 403 iso', async () => {
    const a = await expectIso(targets, { method: 'POST', path: '/api/payments/initiate', body: { provider: 'flooz', phone: '90000000' } }, normalizeErrorEnvelope())
    expect(a.nitro.status).toBe(401)
    const b = await expectIso(targets, { method: 'POST', path: '/api/payments/initiate', headers: { cookie: c.client }, body: { provider: 'flooz', phone: '90000000' } }, normalizeErrorEnvelope())
    expect(b.nitro.status).toBe(403)
  })

  it('POST /payments/initiate corps invalide → 400 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/payments/initiate', headers: { cookie: c.p }, body: { provider: 'orange', phone: '90000000' } }, normalizeErrorEnvelope())
    expect(n.status).toBe(400)
  })

  it('POST /payments/initiate abonnement inconnu → 404 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/payments/initiate', headers: { cookie: c.p }, body: { provider: 'flooz', phone: '90000000', subscriptionId: randomUUID() } }, normalizeErrorEnvelope())
    expect(n.status).toBe(404)
  })

  it('POST /payments/initiate abonnement déjà actif → 409 iso', async () => {
    const { nitro: n } = await expectIso(targets, { method: 'POST', path: '/api/payments/initiate', headers: { cookie: c.pa }, body: { provider: 'flooz', phone: '90000000', subscriptionId: c.activeSubId } }, normalizeErrorEnvelope())
    expect(n.status).toBe(409)
  })

  it('POST /payments/initiate valide → { payment } iso (hors id/createdAt générés)', async () => {
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/payments/initiate', headers: { cookie: c.p }, body: { provider: 'tmoney', phone: '91234567', subscriptionId: c.subId } },
      stripGenerated('payment', ['id', 'createdAt']),
    )
    const payment = (n.body as { payment: { status: string; amount: number } }).payment
    expect(payment).toMatchObject({ status: 'pending', amount: 5000 })
  })

  it('GET /payments/me client → 403 iso ; prestataire → { payments: [], plan } iso', async () => {
    const a = await expectIso(targets, { path: '/api/payments/me', headers: { cookie: c.client } }, normalizeErrorEnvelope())
    expect(a.nitro.status).toBe(403)
    const b = await expectIso(targets, { path: '/api/payments/me', headers: { cookie: c.pm } })
    expect(b.nitro.body).toEqual({ payments: [], plan: 'mensuel' })
  })

  it('GET /payments/:id sans session → 401 iso ; inconnu → 404 iso', async () => {
    const a = await expectIso(targets, { path: `/api/payments/${randomUUID()}` }, normalizeErrorEnvelope())
    expect(a.nitro.status).toBe(401)
    const b = await expectIso(targets, { path: `/api/payments/${randomUUID()}`, headers: { cookie: c.p } }, normalizeErrorEnvelope())
    expect(b.nitro.status).toBe(404)
  })

  it('POST /payments/webhook signature invalide → 401 iso ; paiement inconnu → 404 iso', async () => {
    const body = { paymentId: randomUUID(), status: 'success', timestamp: Date.now(), nonce: `replay-${randomUUID()}` }
    const a = await expectIso(targets, { method: 'POST', path: '/api/payments/webhook', headers: { 'x-webhook-signature': 'deadbeef' }, body }, normalizeErrorEnvelope())
    expect(a.nitro.status).toBe(401)
    const b = await expectIso(targets, { method: 'POST', path: '/api/payments/webhook', headers: sig(body), body }, normalizeErrorEnvelope())
    expect(b.nitro.status).toBe(404)
  })

  it('POST /payments/webhook valide → paiement confirmé iso (séquentiel, 2e idempotent)', async () => {
    const payment = await prisma.payment.create({ data: { userId: c.pwId, subscriptionId: c.pwSubId, provider: 'flooz', phone: '+22890000000', amount: 13500 } })
    const body = { paymentId: payment.id, status: 'success', operatorRef: 'OP-REPLAY', timestamp: Date.now(), nonce: `replay-${randomUUID()}` }
    const { nitro: n } = await expectIso(
      targets,
      { method: 'POST', path: '/api/payments/webhook', headers: sig(body), body },
      stripGenerated('payment', ['createdAt', 'resolvedAt']),
      { sequential: true },
    )
    expect((n.body as { payment: { status: string } }).payment.status).toBe('confirmed')
  })
})
