import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { findOrCreateConversation } from '~~/server/utils/conversationStore'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
import {
  cancelEscrowOrder,
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  ESCROW_COMMISSION_RATE,
  getEscrowOrderByConversationId,
  listDisputedOrders,
  markEscrowOrderDelivered,
  openEscrowDispute,
  payEscrowOrder,
  TACIT_VALIDATION_DELAY_MS,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance, listMovements, PLATFORM_WALLET_USER_ID } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

describe('escrowOrderStore (#194 devis, engagement et paiement bloquant)', () => {
  it('createEscrowOrder crée une commande en attente de paiement', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const order = await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })

    expect(order.status).toBe('awaiting_payment')
    expect(order.paidAt).toBeNull()
    expect((await getEscrowOrderByConversationId(conversationId))?.id).toBe(order.id)
  })

  it('createEscrowOrder est idempotent pour une même conversation', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const first = await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    const second = await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 9999 })

    expect(second.id).toBe(first.id)
    expect(second.amount).toBe(3000)
  })

  it('payEscrowOrder débite le chercheur et met la commande en séquestre si le solde est suffisant', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })

    const result = await payEscrowOrder(conversationId)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('in_escrow')
      expect(result.order.paidAt).not.toBeNull()
    }
    expect(await getBalance(client)).toBe(2000)
  })

  it('payEscrowOrder refuse si le solde est insuffisant, sans modifier la commande', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })

    const result = await payEscrowOrder(conversationId)

    expect(result).toEqual({ ok: false, error: 'insufficient_funds' })
    expect((await getEscrowOrderByConversationId(conversationId))?.status).toBe('awaiting_payment')
    expect(await getBalance(client)).toBe(0)
  })

  it('payEscrowOrder refuse une commande déjà payée', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })

    await payEscrowOrder(conversationId)
    const second = await payEscrowOrder(conversationId)

    expect(second).toEqual({ ok: false, error: 'already_paid' })
    expect(await getBalance(client)).toBe(2000)
  })

  it('payEscrowOrder renvoie not_found pour une conversation sans commande', async () => {
    expect(await payEscrowOrder(id())).toEqual({ ok: false, error: 'not_found' })
  })
})

async function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  await creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  await payEscrowOrder(conversationId)
  await recordEscrowOrderCheckIn(conversationId, null)
  await recordEscrowOrderCheckOut(conversationId, null)
  return markEscrowOrderDelivered(conversationId)
}

describe('escrowOrderStore — double validation et libération (#195)', () => {
  it('markEscrowOrderDelivered échoue si la commande n’est pas en séquestre', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    expect(await markEscrowOrderDelivered(conversationId)).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('markEscrowOrderDelivered passe la commande en "delivered"', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const result = await payAndDeliver(conversationId, id(), id(), 3000)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('delivered')
      expect(result.order.deliveredAt).not.toBeNull()
    }
  })

  it('confirmEscrowOrderReceipt libère les fonds nets de commission vers le prestataire et crédite la commission', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await payAndDeliver(conversationId, client, provider, 10000)

    const result = await confirmEscrowOrderReceipt(conversationId)

    const expectedCommission = Math.round(10000 * ESCROW_COMMISSION_RATE)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.order.status).toBe('released')
    expect(await getBalance(provider)).toBe(10000 - expectedCommission)
    // Le portefeuille plateforme (PLATFORM_WALLET_USER_ID) est un identifiant
    // fixe et partagé : dans la base de test commune, les commissions des
    // autres tests (exécutés en parallèle) s'y cumulent. On vérifie donc le
    // mouvement de commission propre à CETTE commande, isolé par sa référence.
    if (result.ok) {
      const commission = (await listMovements(PLATFORM_WALLET_USER_ID)).find((m) => m.reference === result.order.id)
      expect(commission?.type).toBe('commission')
      expect(commission?.amount).toBe(expectedCommission)
    }
  })

  it('confirmEscrowOrderReceipt échoue tant que la prestation n’est pas marquée terminée', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    await payEscrowOrder(conversationId)

    expect(await confirmEscrowOrderReceipt(conversationId)).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('une commande livrée depuis plus de 72h est libérée automatiquement à la prochaine lecture (validation tacite)', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await payAndDeliver(conversationId, client, provider, 5000)
    now += TACIT_VALIDATION_DELAY_MS + 1

    const order = await getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('released')
    expect(await getBalance(provider)).toBe(5000 - Math.round(5000 * ESCROW_COMMISSION_RATE))
  })

  it('une commande livrée depuis moins de 72h n’est pas libérée automatiquement', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await payAndDeliver(conversationId, client, provider, 5000)
    now += TACIT_VALIDATION_DELAY_MS - 1000

    const order = await getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('delivered')
    expect(await getBalance(provider)).toBe(0)
  })
})

describe('cancelEscrowOrder — annulation prestataire et remboursement (#196)', () => {
  it('rembourse intégralement le chercheur quand la commande est en séquestre (in_escrow)', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    await payEscrowOrder(conversationId)

    const result = await cancelEscrowOrder(conversationId, 'Empêchement de dernière minute')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('refunded')
      expect(result.order.cancelReason).toBe('Empêchement de dernière minute')
    }
    expect(await getBalance(client)).toBe(5000)
  })

  it('rembourse intégralement (sans commission) même si la prestation a déjà été marquée terminée (delivered)', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    await payEscrowOrder(conversationId)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)

    const result = await cancelEscrowOrder(conversationId, 'Finalement indisponible')

    expect(result.ok).toBe(true)
    expect(await getBalance(client)).toBe(3000)
    expect(await getBalance(provider)).toBe(0)
  })

  it('refuse sans motif', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    await payEscrowOrder(conversationId)

    expect(await cancelEscrowOrder(conversationId, '   ')).toEqual({ ok: false, error: 'reason_required' })
    expect(await getBalance(client)).toBe(0)
  })

  it('refuse d’annuler une commande non payée', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 3000 })
    expect(await cancelEscrowOrder(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('refuse d’annuler une commande déjà libérée', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    await payEscrowOrder(conversationId)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)
    await confirmEscrowOrderReceipt(conversationId)

    expect(await cancelEscrowOrder(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('renvoie not_found pour une conversation sans commande', async () => {
    expect(await cancelEscrowOrder(id(), 'motif')).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('openEscrowDispute — litige sur une commande en séquestre (#197)', () => {
  it('gèle les fonds sans les libérer ni les rembourser', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 5000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    await payEscrowOrder(conversationId)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)

    const result = await openEscrowDispute(conversationId, 'Prestation non conforme')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.status).toBe('disputed')
      expect(result.order.disputeReason).toBe('Prestation non conforme')
    }
    expect(await getBalance(client)).toBe(2000)
    expect(await getBalance(provider)).toBe(0)
  })

  it('refuse sans motif', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    await payEscrowOrder(conversationId)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)

    expect(await openEscrowDispute(conversationId, '  ')).toEqual({ ok: false, error: 'reason_required' })
  })

  it('refuse tant que la prestation n’a pas été marquée terminée', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    await payEscrowOrder(conversationId)

    expect(await openEscrowDispute(conversationId, 'motif')).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('une commande en litige n’est jamais libérée automatiquement, même après le délai de validation tacite', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    const provider = id()
    let now = 1_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 3000 })
    await payEscrowOrder(conversationId)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)
    await openEscrowDispute(conversationId, 'Prestation non conforme')
    now += TACIT_VALIDATION_DELAY_MS + 1

    const order = await getEscrowOrderByConversationId(conversationId)

    spy.mockRestore()

    expect(order?.status).toBe('disputed')
    expect(await getBalance(provider)).toBe(0)
  })

  it('renvoie not_found pour une conversation sans commande', async () => {
    expect(await openEscrowDispute(id(), 'motif')).toEqual({ ok: false, error: 'not_found' })
  })

  it('listDisputedOrders liste uniquement les commandes en litige', async () => {
    const conversationId = (await findOrCreateConversation(id(), id())).id
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 3000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 3000 })
    await payEscrowOrder(conversationId)
    await recordEscrowOrderCheckIn(conversationId, null)
    await recordEscrowOrderCheckOut(conversationId, null)
    await markEscrowOrderDelivered(conversationId)
    await openEscrowDispute(conversationId, 'motif')

    expect((await listDisputedOrders()).some((order) => order.conversationId === conversationId)).toBe(true)
  })
})
