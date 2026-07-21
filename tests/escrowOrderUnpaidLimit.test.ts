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
  it('renvoie 0 pour un chercheur sans aucune commande', () => {
    expect(countUnpaidOrdersForClient(id())).toBe(0)
  })

  it('compte uniquement les commandes en attente de paiement, tous prestataires confondus', () => {
    const client = id()
    createEscrowOrder({ conversationId: id(), clientId: client, providerId: id(), amount: 1000 })
    createEscrowOrder({ conversationId: id(), clientId: client, providerId: id(), amount: 2000 })

    expect(countUnpaidOrdersForClient(client)).toBe(2)
  })

  it('ne compte pas les commandes déjà payées (in_escrow)', () => {
    const client = id()
    creditWallet({ walletUserId: client, type: 'recharge', amount: 1000, reference: 'REF' })
    const conversationId = id()
    createEscrowOrder({ conversationId, clientId: client, providerId: id(), amount: 1000 })
    payEscrowOrder(conversationId)

    expect(countUnpaidOrdersForClient(client)).toBe(0)
  })

  it('ne compte pas les commandes d’un autre chercheur', () => {
    createEscrowOrder({ conversationId: id(), clientId: id(), providerId: id(), amount: 1000 })
    expect(countUnpaidOrdersForClient(id())).toBe(0)
  })

  it('MAX_SIMULTANEOUS_UNPAID_ORDERS est une valeur nommée et positive', () => {
    expect(MAX_SIMULTANEOUS_UNPAID_ORDERS).toBeGreaterThan(0)
  })
})
