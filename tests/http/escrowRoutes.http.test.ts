// @vitest-environment node
//
// Environnement Node natif plutôt que happy-dom (par défaut, voir
// vitest.config.ts) : le `fetch` de happy-dom applique la politique de
// même origine comme un vrai navigateur et bloque toute requête vers le
// serveur de test local (origine différente) — le `fetch` natif de Node
// (undici) n'a pas cette contrainte, adaptée à un contexte serveur-à-serveur.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findOrCreateConversation } from '~~/server/utils/conversationStore'
import { createEscrowOrder, getEscrowOrderByConversationId, type EscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'
import { createAuthedUser } from '../setup/httpAuth'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import cancelHandler from '~~/server/api/conversations/[id]/cancel.post'
import checkInHandler from '~~/server/api/conversations/[id]/check-in.post'
import checkOutHandler from '~~/server/api/conversations/[id]/check-out.post'
import deliverHandler from '~~/server/api/conversations/[id]/deliver.post'
import disputeHandler from '~~/server/api/conversations/[id]/dispute.post'
import payHandler from '~~/server/api/conversations/[id]/pay.post'
import receiveHandler from '~~/server/api/conversations/[id]/receive.post'

/**
 * Tests d'intégration HTTP du cycle de vie escrow (#261) : contrairement aux
 * tests unitaires de escrowOrderStore.test.ts (appels de fonction directs),
 * ceux-ci passent par de vraies requêtes HTTP contre les handlers réels —
 * autorisation (`requireClientRole`/`requireProviderRole`, contrôle de
 * propriété de la conversation) et enchaînement d'états sont donc exercés
 * tels qu'en production, pas simulés.
 */
let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'post', path: '/conversations/:id/pay', handler: payHandler },
    { method: 'post', path: '/conversations/:id/check-in', handler: checkInHandler },
    { method: 'post', path: '/conversations/:id/check-out', handler: checkOutHandler },
    { method: 'post', path: '/conversations/:id/deliver', handler: deliverHandler },
    { method: 'post', path: '/conversations/:id/receive', handler: receiveHandler },
    { method: 'post', path: '/conversations/:id/dispute', handler: disputeHandler },
    { method: 'post', path: '/conversations/:id/cancel', handler: cancelHandler },
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

/**
 * Preuve d'intervention (#268) : `deliver` refuse désormais toute commande
 * sans check-in ET check-out enregistrés (voir escrowOrderStore.ts,
 * markEscrowOrderDelivered) — obligatoire entre `pay` et `deliver` pour tout
 * chemin nominal qui va jusqu'à la livraison.
 */
async function checkInOut(conversationId: string, providerCookieHeader: string) {
  await postJson(`/conversations/${conversationId}/check-in`, providerCookieHeader)
  await postJson(`/conversations/${conversationId}/check-out`, providerCookieHeader)
}

describe('POST /conversations/:id/pay (#194)', () => {
  it('chemin nominal : le client paie une commande en attente, elle passe en séquestre', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })

    const { status, json } = await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('in_escrow')
  })

  it('refus d’autorisation : un tiers qui n’est pas le client de la conversation reçoit 404', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const stranger = await createAuthedUser('client')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })

    const { status } = await postJson(`/conversations/${conversation.id}/pay`, stranger.cookieHeader)

    expect(status).toBe(404)
  })
})

describe('POST /conversations/:id/deliver (#195)', () => {
  it('chemin nominal : le prestataire marque une commande en séquestre comme livrée', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await checkInOut(conversation.id, provider.cookieHeader)

    const { status, json } = await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('delivered')
  })

  it('refus d’autorisation : le client (pas le prestataire) reçoit 404', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)

    const { status } = await postJson(`/conversations/${conversation.id}/deliver`, client.cookieHeader)

    expect(status).toBe(404)
  })
})

describe('POST /conversations/:id/receive (#195)', () => {
  it('chemin nominal : le client confirme la réception, les fonds sont libérés', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await checkInOut(conversation.id, provider.cookieHeader)
    await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)

    const { status, json } = await postJson(`/conversations/${conversation.id}/receive`, client.cookieHeader)

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('released')
  })

  it('refus d’autorisation : le prestataire (pas le client) reçoit 403 (requireClientRole précède le contrôle de propriété)', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)

    const { status } = await postJson(`/conversations/${conversation.id}/receive`, provider.cookieHeader)

    // Le prestataire a bien un rôle différent de 'client' : requireClientRole()
    // rejette avant même d'atteindre le contrôle de propriété de la
    // conversation, d'où 403 et non 404 ici (contrairement à deliver/cancel,
    // qui utilisent requireSessionUser() sans restriction de rôle).
    expect(status).toBe(403)
  })
})

describe('POST /conversations/:id/dispute (#197)', () => {
  it('chemin nominal : le client ouvre un litige avec un motif, les fonds sont gelés', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await checkInOut(conversation.id, provider.cookieHeader)
    await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)

    const { status, json } = await postJson(`/conversations/${conversation.id}/dispute`, client.cookieHeader, {
      reason: 'Prestation non conforme',
    })

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('disputed')
  })

  it('validation : un motif manquant est refusé avec 400 (zod, readSchemaBody)', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)

    const { status } = await postJson(`/conversations/${conversation.id}/dispute`, client.cookieHeader, { reason: '  ' })

    expect(status).toBe(400)
  })

  it('refus d’autorisation : un tiers reçoit 404', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const stranger = await createAuthedUser('client')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })

    const { status } = await postJson(`/conversations/${conversation.id}/dispute`, stranger.cookieHeader, {
      reason: 'motif',
    })

    expect(status).toBe(404)
  })
})

describe('POST /conversations/:id/cancel (#196)', () => {
  it('chemin nominal : le prestataire annule avec un motif, remboursement intégral', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)

    const { status, json } = await postJson(`/conversations/${conversation.id}/cancel`, provider.cookieHeader, {
      reason: 'Empêchement de dernière minute',
    })

    expect(status).toBe(200)
    expect((json as { order: EscrowOrder }).order.status).toBe('refunded')
  })

  it('refus d’autorisation : le client (pas le prestataire) reçoit 404', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)

    const { status } = await postJson(`/conversations/${conversation.id}/cancel`, client.cookieHeader, { reason: 'motif' })

    expect(status).toBe(404)
  })
})

describe('Orchestration escrow de bout en bout via HTTP (#261)', () => {
  it('pay → deliver → receive enchaînés par de vraies requêtes HTTP successives', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 8000, reference: 'REF' })
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 8000 })

    const paid = await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    expect(paid.status).toBe(200)

    await checkInOut(conversation.id, provider.cookieHeader)

    const delivered = await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)
    expect(delivered.status).toBe(200)

    const received = await postJson(`/conversations/${conversation.id}/receive`, client.cookieHeader)
    expect(received.status).toBe(200)

    expect((await getEscrowOrderByConversationId(conversation.id))?.status).toBe('released')
  })

  it('un état atteint dans le mauvais ordre est refusé (deliver avant tout paiement)', async () => {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 5000 })

    const { status } = await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)

    expect(status).toBe(409)
  })
})
