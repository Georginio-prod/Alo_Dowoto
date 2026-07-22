import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  countUnpaidOrdersForClient,
  createEscrowOrder,
  MAX_SIMULTANEOUS_UNPAID_ORDERS,
  payEscrowOrder,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

describe('countUnpaidOrdersForClient — limite de demandes non payées simultanées (#280)', () => {
  it('renvoie 0 pour un chercheur sans aucune commande', async () => {
    expect(await countUnpaidOrdersForClient(id())).toBe(0)
  })

  it('compte uniquement les commandes en attente de paiement, tous prestataires confondus', async () => {
    const client = id()
    await createEscrowOrder({ conversationId: id(), clientId: client, providerId: id(), amount: 1000 })
    await createEscrowOrder({ conversationId: id(), clientId: client, providerId: id(), amount: 2000 })

    expect(await countUnpaidOrdersForClient(client)).toBe(2)
  })

  it('ne compte pas les commandes déjà payées (in_escrow)', async () => {
    const client = id()
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 1000, reference: 'REF' })
    const conversationId = id()
    await createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 1000 })
    await payEscrowOrder(conversationId)

    expect(await countUnpaidOrdersForClient(client)).toBe(0)
  })

  it('ne compte pas les commandes d’un autre chercheur', async () => {
    await createEscrowOrder({ conversationId: id(), clientId: id(), providerId: id(), amount: 1000 })
    expect(await countUnpaidOrdersForClient(id())).toBe(0)
  })

  it('MAX_SIMULTANEOUS_UNPAID_ORDERS est une valeur nommée et positive', () => {
    expect(MAX_SIMULTANEOUS_UNPAID_ORDERS).toBeGreaterThan(0)
  })
})
