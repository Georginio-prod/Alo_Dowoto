// @vitest-environment node
//
// Voir escrowRoutes.http.test.ts pour l'explication du choix d'environnement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findOrCreateConversation } from '~~/server/utils/conversationStore'
import { PROVIDER_DISPUTE_PENALTY_RATE } from '~~/server/utils/escrowDisputeResolution'
import { createEscrowOrder, type EscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'
import { createAuthedUser } from '../setup/httpAuth'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import checkInHandler from '~~/server/api/conversations/[id]/check-in.post'
import checkOutHandler from '~~/server/api/conversations/[id]/check-out.post'
import confirmDisputeResolutionHandler from '~~/server/api/conversations/[id]/confirm-dispute-resolution.post'
import deliverHandler from '~~/server/api/conversations/[id]/deliver.post'
import disputeHandler from '~~/server/api/conversations/[id]/dispute.post'
import payHandler from '~~/server/api/conversations/[id]/pay.post'
import respondDisputeHandler from '~~/server/api/conversations/[id]/respond-dispute.post'

/**
 * Tests d'intégration HTTP du dénouement d'un litige (#274) : le chercheur
 * confirme ou conteste la réponse du prestataire via de vraies requêtes HTTP
 * (autorisation par rôle/propriété incluse), pas juste au niveau du store
 * (voir escrowOrderDisputeResolution.test.ts).
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'post', path: '/conversations/:id/pay', handler: payHandler },
    { method: 'post', path: '/conversations/:id/check-in', handler: checkInHandler },
    { method: 'post', path: '/conversations/:id/check-out', handler: checkOutHandler },
    { method: 'post', path: '/conversations/:id/deliver', handler: deliverHandler },
    { method: 'post', path: '/conversations/:id/dispute', handler: disputeHandler },
    { method: 'post', path: '/conversations/:id/respond-dispute', handler: respondDisputeHandler },
    { method: 'post', path: '/conversations/:id/confirm-dispute-resolution', handler: confirmDisputeResolutionHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

async function postJson(path: string, cookieHeader: string, body?: unknown) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookieHeader },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

async function setUpDisputedOrder(amount = 5000) {
  const client = await createAuthedUser('client')
  const provider = await createAuthedUser('prestataire')
  const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
  await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount, reference: 'REF' })
  await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount })
  await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
  await postJson(`/conversations/${conversation.id}/check-in`, provider.cookieHeader)
  await postJson(`/conversations/${conversation.id}/check-out`, provider.cookieHeader)
  await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)
  await postJson(`/conversations/${conversation.id}/dispute`, client.cookieHeader, { reason: 'Prestation non conforme' })
  return { client, provider, conversation }
}

describe('POST /conversations/:id/confirm-dispute-resolution (#274)', () => {
  it("refuse tant que le prestataire n'a pas répondu au litige", async () => {
    const { client, conversation } = await setUpDisputedOrder()

    const { status } = await postJson(`/conversations/${conversation.id}/confirm-dispute-resolution`, client.cookieHeader, { confirmed: true })

    expect(status).toBe(400)
  })

  it('confirmed: true libère les fonds au prestataire', async () => {
    const { client, provider, conversation } = await setUpDisputedOrder(5000)
    await postJson(`/conversations/${conversation.id}/respond-dispute`, provider.cookieHeader, { response: 'Tout est fait.' })

    const { status, json } = await postJson(`/conversations/${conversation.id}/confirm-dispute-resolution`, client.cookieHeader, { confirmed: true })

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('released')
  })

  it('confirmed: false rembourse le chercheur et pénalise le prestataire', async () => {
    const { client, provider, conversation } = await setUpDisputedOrder(5000)
    await postJson(`/conversations/${conversation.id}/respond-dispute`, provider.cookieHeader, { response: 'Tout est fait.' })
    // Solde préalable (autre commande déjà réglée) : sans quoi la pénalité serait plafonnée à 0.
    await creditWallet({ walletUserId: provider.user.id, type: 'escrow_release', amount: 10000, reference: 'autre-commande' })

    const { status, json } = await postJson(`/conversations/${conversation.id}/confirm-dispute-resolution`, client.cookieHeader, { confirmed: false })

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('refunded')
    expect(await getBalance(provider.user.id)).toBe(10000 - Math.round(5000 * PROVIDER_DISPUTE_PENALTY_RATE))
  })

  it('refus d’autorisation : le prestataire ne peut pas confirmer à la place du chercheur', async () => {
    const { provider, conversation } = await setUpDisputedOrder()
    await postJson(`/conversations/${conversation.id}/respond-dispute`, provider.cookieHeader, { response: 'Tout est fait.' })

    const { status } = await postJson(`/conversations/${conversation.id}/confirm-dispute-resolution`, provider.cookieHeader, { confirmed: true })

    expect(status).toBe(404)
  })

  it('validation : un champ confirmed manquant/invalide est refusé avec 400 (zod)', async () => {
    const { client, provider, conversation } = await setUpDisputedOrder()
    await postJson(`/conversations/${conversation.id}/respond-dispute`, provider.cookieHeader, { response: 'Tout est fait.' })

    const { status } = await postJson(`/conversations/${conversation.id}/confirm-dispute-resolution`, client.cookieHeader, { confirmed: 'oui' })

    expect(status).toBe(400)
  })
})
