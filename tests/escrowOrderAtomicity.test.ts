import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { findOrCreateConversation } from '~~/server/utils/conversationStore'
import { recordEscrowOrderCheckIn, recordEscrowOrderCheckOut } from '~~/server/utils/escrowInterventionProof'
import {
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  ESCROW_COMMISSION_RATE,
  markEscrowOrderDelivered,
  payEscrowOrder,
  releaseOrderFunds,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance, PLATFORM_WALLET_USER_ID } from '~~/server/utils/walletStore'

/**
 * Atomicité et idempotence des flux d'argent (#366, correctif audit C1).
 *
 * Avant ce correctif, le débit/crédit du portefeuille et le changement de statut
 * de la commande étaient deux écritures séparées ; une re-déclenche à la lecture
 * (`applyTacitValidationIfExpired`) ou un réessai après paiement pouvait
 * re-créditer le prestataire ou re-débiter le chercheur. Chaque opération est
 * désormais enveloppée dans une seule transaction, avec relecture du statut
 * *dans* la transaction en garde d'idempotence : rejouer l'opération sur un état
 * périmé ne touche plus aux portefeuilles.
 */

function id(): string {
  return randomUUID()
}

async function payAndDeliver(conversationId: string, client: string, provider: string, amount: number) {
  await creditWallet({ walletUserId: client, type: 'recharge', amount, reference: 'REF' })
  await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount })
  await payEscrowOrder(conversationId)
  await recordEscrowOrderCheckIn(conversationId, null)
  await recordEscrowOrderCheckOut(conversationId, null)
  const delivered = await markEscrowOrderDelivered(conversationId)
  if (!delivered.ok) throw new Error('setup: livraison échouée')
  return delivered.order
}

describe('Atomicité des flux séquestre (#366) — libération', () => {
  it('ne crédite prestataire et plateforme qu’une seule fois même si la libération est rejouée sur un état périmé', async () => {
    const client = id()
    const provider = id()
    const amount = 3000
    const commission = Math.round(amount * ESCROW_COMMISSION_RATE)
    const providerNet = amount - commission

    const conversation = await findOrCreateConversation(client, provider)
    const deliveredOrder = await payAndDeliver(conversation.id, client, provider, amount)

    const platformBefore = await getBalance(PLATFORM_WALLET_USER_ID)

    // Première libération : crédite réellement.
    await releaseOrderFunds(deliveredOrder)
    // Re-déclenche avec le MÊME objet périmé (statut `delivered` en mémoire),
    // exactement le scénario du re-trigger décrit dans l'audit (C1 cas 2).
    await releaseOrderFunds(deliveredOrder)
    await releaseOrderFunds(deliveredOrder)

    expect(await getBalance(provider)).toBe(providerNet)
    expect(await getBalance(PLATFORM_WALLET_USER_ID)).toBe(platformBefore + commission)
  })

  it('la confirmation de réception rejouée renvoie invalid_status sans re-créditer', async () => {
    const client = id()
    const provider = id()
    const amount = 5000
    const commission = Math.round(amount * ESCROW_COMMISSION_RATE)
    const providerNet = amount - commission

    const conversation = await findOrCreateConversation(client, provider)
    await payAndDeliver(conversation.id, client, provider, amount)

    const first = await confirmEscrowOrderReceipt(conversation.id)
    expect(first.ok).toBe(true)

    const second = await confirmEscrowOrderReceipt(conversation.id)
    expect(second).toEqual({ ok: false, error: 'invalid_status' })

    expect(await getBalance(provider)).toBe(providerNet)
  })
})

describe('Atomicité des flux séquestre (#366) — paiement', () => {
  it('ne débite le chercheur qu’une seule fois même si le paiement est rejoué', async () => {
    const client = id()
    const provider = id()
    const amount = 4000

    // Solde généreux : si un second débit passait, il aurait de quoi le faire.
    await creditWallet({ walletUserId: client, type: 'recharge', amount: amount * 3, reference: 'REF' })
    const conversation = await findOrCreateConversation(client, provider)
    await createEscrowOrder({ conversationId: conversation.id, clientId: client, providerId: provider, amount })

    const first = await payEscrowOrder(conversation.id)
    expect(first.ok).toBe(true)

    const second = await payEscrowOrder(conversation.id)
    expect(second).toEqual({ ok: false, error: 'already_paid' })

    // Débité une seule fois : 3× le montant crédité, 1× débité en séquestre.
    expect(await getBalance(client)).toBe(amount * 3 - amount)
  })
})
