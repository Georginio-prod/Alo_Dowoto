// @vitest-environment node
//
// Environnement Node natif (voir tests/http/escrowRoutes.http.test.ts pour
// l'explication) : le dashboard admin (#dashboard-admin) est un espace
// sensible (fonds, comptes, litiges) — ces tests exercent les routes réelles
// derrière un vrai serveur HTTP, pas des appels de fonction simulés.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findOrCreateConversation } from '~~/server/utils/conversationStore'
import { createEscrowOrder } from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'
import { getVerification, submitVerification } from '~~/server/utils/verificationStore'
import { createAuthedUser } from '../setup/httpAuth'
import { startTestServer, type TestServer } from '../setup/httpTestApp'

import overviewHandler from '~~/server/api/admin/overview.get'
import releaseHandler from '~~/server/api/admin/payments/[id]/release.post'
import refundHandler from '~~/server/api/admin/payments/[id]/refund.post'
import resolveDisputeHandler from '~~/server/api/admin/disputes/[id]/resolve.post'
import kycRejectHandler from '~~/server/api/admin/providers/[id]/kyc-reject.post'
import suspendHandler from '~~/server/api/admin/users/[id]/suspend.post'

import payHandler from '~~/server/api/conversations/[id]/pay.post'
import checkInHandler from '~~/server/api/conversations/[id]/check-in.post'
import checkOutHandler from '~~/server/api/conversations/[id]/check-out.post'
import deliverHandler from '~~/server/api/conversations/[id]/deliver.post'
import disputeHandler from '~~/server/api/conversations/[id]/dispute.post'

let server: TestServer

beforeAll(async () => {
  server = await startTestServer([
    { method: 'get', path: '/admin/overview', handler: overviewHandler },
    { method: 'post', path: '/admin/payments/:id/release', handler: releaseHandler },
    { method: 'post', path: '/admin/payments/:id/refund', handler: refundHandler },
    { method: 'post', path: '/admin/disputes/:id/resolve', handler: resolveDisputeHandler },
    { method: 'post', path: '/admin/providers/:id/kyc-reject', handler: kycRejectHandler },
    { method: 'post', path: '/admin/users/:id/suspend', handler: suspendHandler },
    { method: 'post', path: '/conversations/:id/pay', handler: payHandler },
    { method: 'post', path: '/conversations/:id/check-in', handler: checkInHandler },
    { method: 'post', path: '/conversations/:id/check-out', handler: checkOutHandler },
    { method: 'post', path: '/conversations/:id/deliver', handler: deliverHandler },
    { method: 'post', path: '/conversations/:id/dispute', handler: disputeHandler },
  ])
})

afterAll(async () => {
  await server.close()
})

async function getJson(path: string, cookieHeader: string) {
  const response = await fetch(`${server.url}${path}`, { headers: { cookie: cookieHeader } })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

async function postJson(path: string, cookieHeader: string, body?: unknown) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookieHeader },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

describe('Contrôle d’accès admin (#dashboard-admin)', () => {
  it('refuse un compte client', async () => {
    const client = await createAuthedUser('client')
    const { status } = await getJson('/admin/overview', client.cookieHeader)
    expect(status).toBe(403)
  })

  it('refuse un compte prestataire', async () => {
    const provider = await createAuthedUser('prestataire')
    const { status } = await getJson('/admin/overview', provider.cookieHeader)
    expect(status).toBe(403)
  })

  it('refuse une requête non authentifiée', async () => {
    const { status } = await getJson('/admin/overview', '')
    expect(status).toBe(401)
  })

  it('autorise un compte admin', async () => {
    const admin = await createAuthedUser('admin')
    const { status, json } = await getJson('/admin/overview', admin.cookieHeader)
    expect(status).toBe(200)
    expect(json.kpis).toBeDefined()
  })

  it('un compte suspendu par un admin ne peut plus accéder au dashboard, même admin', async () => {
    const admin = await createAuthedUser('admin')
    const target = await createAuthedUser('admin')

    await postJson(`/admin/users/${target.user.id}/suspend`, admin.cookieHeader, { reason: 'Test de suspension.' })

    const { status } = await getJson('/admin/overview', target.cookieHeader)
    expect(status).toBe(401)
  })
})

describe('Libération manuelle des fonds (#dashboard-admin, module Paiements)', () => {
  it('libère les fonds d’une commande en séquestre et crédite le prestataire net de commission', async () => {
    const admin = await createAuthedUser('admin')
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 10_000, reference: 'REF-release' })
    const order = await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 10_000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)

    const { status } = await postJson(`/admin/payments/${order.id}/release`, admin.cookieHeader)
    expect(status).toBe(200)

    const providerBalance = await getBalance(provider.user.id)
    expect(providerBalance).toBe(9_000) // 10 000 - 10% de commission
  })

  it('refuse de libérer une commande déjà libérée', async () => {
    const admin = await createAuthedUser('admin')
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 3_000, reference: 'REF-release-2' })
    const order = await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 3_000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await postJson(`/admin/payments/${order.id}/release`, admin.cookieHeader)

    const { status } = await postJson(`/admin/payments/${order.id}/release`, admin.cookieHeader)
    expect(status).toBe(400)
  })
})

describe('Remboursement admin (#dashboard-admin, module Paiements)', () => {
  it('rembourse intégralement le chercheur, motif obligatoire', async () => {
    const admin = await createAuthedUser('admin')
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount: 7_000, reference: 'REF-refund' })
    const order = await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount: 7_000 })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)

    const rejected = await postJson(`/admin/payments/${order.id}/refund`, admin.cookieHeader, { reason: '' })
    expect(rejected.status).toBe(400)

    const { status } = await postJson(`/admin/payments/${order.id}/refund`, admin.cookieHeader, { reason: 'Prestation non réalisée, remboursement commercial.' })
    expect(status).toBe(200)
    expect(await getBalance(client.user.id)).toBe(7_000)
  })
})

describe('Résolution de litige (#dashboard-admin, module Litiges)', () => {
  async function openDispute(amount: number) {
    const client = await createAuthedUser('client')
    const provider = await createAuthedUser('prestataire')
    const conversation = await findOrCreateConversation(client.user.id, provider.user.id)
    await creditWallet({ walletUserId: client.user.id, type: 'recharge', amount, reference: `REF-dispute-${conversation.id}` })
    const order = await createEscrowOrder({ conversationId: conversation.id, clientId: client.user.id, providerId: provider.user.id, amount })
    await postJson(`/conversations/${conversation.id}/pay`, client.cookieHeader)
    await postJson(`/conversations/${conversation.id}/check-in`, provider.cookieHeader)
    await postJson(`/conversations/${conversation.id}/check-out`, provider.cookieHeader)
    await postJson(`/conversations/${conversation.id}/deliver`, provider.cookieHeader)
    await postJson(`/conversations/${conversation.id}/dispute`, client.cookieHeader, { reason: 'Travail non conforme.' })
    return { client, provider, order }
  }

  it('trancher en faveur du prestataire libère les fonds', async () => {
    const admin = await createAuthedUser('admin')
    const { provider, order } = await openDispute(10_000)

    const { status } = await postJson(`/admin/disputes/${order.id}/resolve`, admin.cookieHeader, { outcome: 'provider', note: 'Preuves suffisantes côté prestataire.' })
    expect(status).toBe(200)
    expect(await getBalance(provider.user.id)).toBe(9_000)
  })

  it('trancher en faveur du chercheur rembourse intégralement', async () => {
    const admin = await createAuthedUser('admin')
    const { client, order } = await openDispute(4_000)

    const { status } = await postJson(`/admin/disputes/${order.id}/resolve`, admin.cookieHeader, { outcome: 'client', note: 'Travail non réalisé.' })
    expect(status).toBe(200)
    expect(await getBalance(client.user.id)).toBe(4_000)
  })

  it('partager le montant répartit entre les deux parties', async () => {
    const admin = await createAuthedUser('admin')
    const { client, provider, order } = await openDispute(10_000)

    const { status } = await postJson(`/admin/disputes/${order.id}/resolve`, admin.cookieHeader, { outcome: 'split', providerSharePercent: 30, note: 'Prestation partiellement réalisée.' })
    expect(status).toBe(200)
    expect(await getBalance(provider.user.id)).toBe(3_000)
    expect(await getBalance(client.user.id)).toBe(7_000)
  })
})

describe('Décision KYC (#dashboard-admin, module Prestataires)', () => {
  it('un refus révoque réellement le badge vérifié', async () => {
    const admin = await createAuthedUser('admin')
    const provider = await createAuthedUser('prestataire')

    submitVerification(provider.user.id, 'data:image/png;base64,AAAA', 'data:image/png;base64,BBBB')
    expect(getVerification(provider.user.id)).not.toBeNull()

    const { status } = await postJson(`/admin/providers/${provider.user.id}/kyc-reject`, admin.cookieHeader, { reason: 'Documents illisibles.' })
    expect(status).toBe(200)
    expect(getVerification(provider.user.id)).toBeNull()
  })
})
