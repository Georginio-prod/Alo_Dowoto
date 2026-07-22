// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import { createPayment, getPayment } from '~~/server/utils/paymentStore'
import { createPendingSubscription, getSubscriptionById } from '~~/server/utils/subscriptionStore'
import { createRecharge, getRecharge } from '~~/server/utils/walletRechargeStore'
import { getBalance } from '~~/server/utils/walletStore'
import { signWebhookBody } from '~~/server/utils/webhookSignature'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import paymentsWebhookHandler from '~~/server/api/payments/webhook.post'
import walletWebhookHandler from '~~/server/api/wallet/webhook.post'

/**
 * Tests d'intégration HTTP des webhooks opérateur (#261) : signature HMAC
 * (server/utils/webhookSignature.ts) et idempotence en cas de rejeu — les
 * deux points explicitement demandés par l'issue, non couverts par les
 * tests unitaires existants (webhookSignature.test.ts ne teste que la
 * fonction de signature isolément, pas la route qui la consomme).
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'post', path: '/payments/webhook', handler: paymentsWebhookHandler },
    { method: 'post', path: '/wallet/webhook', handler: walletWebhookHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

/**
 * Depuis la bascule des abonnements sur Prisma (#342), un abonnement référence
 * un vrai compte (FK `Subscription.userId → User`). On matérialise donc le
 * compte prestataire avant de lui créer un abonnement. Idempotent (upsert).
 */
async function ensureProviderUser(providerId: string) {
  await prisma.user.upsert({
    where: { id: providerId },
    update: {},
    create: { id: providerId, contact: `prov-${providerId}`, role: 'prestataire' },
  })
}

async function postWebhook(path: string, rawBody: string, signature: string | undefined) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(signature !== undefined ? { 'x-webhook-signature': signature } : {}),
    },
    body: rawBody,
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

describe('POST /payments/webhook (#34)', () => {
  it('refuse une signature invalide (401)', async () => {
    const rawBody = JSON.stringify({ paymentId: 'inexistant', status: 'success' })
    const { status } = await postWebhook('/payments/webhook', rawBody, 'signature-forgee')
    expect(status).toBe(401)
  })

  it('refuse une requête sans en-tête de signature (401)', async () => {
    const rawBody = JSON.stringify({ paymentId: 'inexistant', status: 'success' })
    const { status } = await postWebhook('/payments/webhook', rawBody, undefined)
    expect(status).toBe(401)
  })

  it('chemin nominal : confirme le paiement et active l’abonnement associé', async () => {
    await ensureProviderUser('provider-webhook-1')
    const subscription = await createPendingSubscription('provider-webhook-1', 'mensuel')
    const payment = createPayment({
      userId: 'provider-webhook-1',
      subscriptionId: subscription.id,
      provider: 'flooz',
      phone: '90123456',
      amount: 5000,
    })

    const rawBody = JSON.stringify({ paymentId: payment.id, status: 'success', operatorRef: 'OP-REF-1' })
    const signature = signWebhookBody(rawBody)

    const { status, json } = await postWebhook('/payments/webhook', rawBody, signature)

    expect(status).toBe(200)
    expect((json as { payment: { status: string } }).payment.status).toBe('confirmed')
    expect(getPayment(payment.id)?.operatorRef).toBe('OP-REF-1')
    expect((await getSubscriptionById(subscription.id))?.status).toBe('actif')
  })

  it('idempotence : un rejeu du même webhook ne retraite pas le paiement (statut déjà résolu renvoyé tel quel)', async () => {
    await ensureProviderUser('provider-webhook-2')
    const subscription = await createPendingSubscription('provider-webhook-2', 'mensuel')
    const payment = createPayment({
      userId: 'provider-webhook-2',
      subscriptionId: subscription.id,
      provider: 'flooz',
      phone: '90123456',
      amount: 5000,
    })

    const rawBody = JSON.stringify({ paymentId: payment.id, status: 'success', operatorRef: 'OP-REF-2' })
    const signature = signWebhookBody(rawBody)

    const first = await postWebhook('/payments/webhook', rawBody, signature)
    const replay = await postWebhook('/payments/webhook', rawBody, signature)

    expect(first.status).toBe(200)
    expect(replay.status).toBe(200)
    expect((replay.json as { payment: { operatorRef: string } }).payment.operatorRef).toBe('OP-REF-2')
    // Un seul enregistrement resolvedAt, pas modifié par le rejeu.
    expect(getPayment(payment.id)?.resolvedAt).toBe((first.json as { payment: { resolvedAt: number } }).payment.resolvedAt)
  })

  it('renvoie 404 pour un paiement inconnu (signature valide, id inexistant)', async () => {
    const rawBody = JSON.stringify({ paymentId: 'id-totalement-inconnu', status: 'success' })
    const signature = signWebhookBody(rawBody)

    const { status } = await postWebhook('/payments/webhook', rawBody, signature)

    expect(status).toBe(404)
  })
})

describe('POST /wallet/webhook (#193)', () => {
  it('refuse une signature invalide (401)', async () => {
    const rawBody = JSON.stringify({ rechargeId: 'inexistant', status: 'success' })
    const { status } = await postWebhook('/wallet/webhook', rawBody, 'signature-forgee')
    expect(status).toBe(401)
  })

  it('chemin nominal : confirme la recharge et crédite le portefeuille', async () => {
    const recharge = createRecharge({ userId: 'client-webhook-1', provider: 'tmoney', phone: '90123456', amount: 3000 })

    const rawBody = JSON.stringify({ rechargeId: recharge.id, status: 'success', operatorRef: 'OP-REF-3' })
    const signature = signWebhookBody(rawBody)

    const { status, json } = await postWebhook('/wallet/webhook', rawBody, signature)

    expect(status).toBe(200)
    expect((json as { recharge: { status: string } }).recharge.status).toBe('confirmed')
    expect(getBalance('client-webhook-1')).toBe(3000)
  })

  it('idempotence : un rejeu ne crédite pas le portefeuille une seconde fois', async () => {
    const recharge = createRecharge({ userId: 'client-webhook-2', provider: 'tmoney', phone: '90123456', amount: 3000 })
    const rawBody = JSON.stringify({ rechargeId: recharge.id, status: 'success', operatorRef: 'OP-REF-4' })
    const signature = signWebhookBody(rawBody)

    await postWebhook('/wallet/webhook', rawBody, signature)
    await postWebhook('/wallet/webhook', rawBody, signature)

    expect(getBalance('client-webhook-2')).toBe(3000)
    expect(getRecharge(recharge.id)?.status).toBe('confirmed')
  })
})
