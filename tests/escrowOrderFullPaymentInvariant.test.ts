import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  confirmEscrowOrderReceipt,
  createEscrowOrder,
  markEscrowOrderDelivered,
} from '~~/server/utils/escrowOrderStore'
import { creditWallet, getBalance } from '~~/server/utils/walletStore'

function id(): string {
  return randomUUID()
}

/**
 * Décision produit (#276, ADR 0001, `docs/decisions/0001-paiement-integral-plateforme.md`) :
 * 100% du montant transite par la plateforme, aucun acompte/solde résiduel
 * réglé en espèces. Ces tests figent l'invariant structurel qui applique
 * cette décision : une commande ne peut jamais atteindre `delivered` ou
 * `released` — donc être clôturée — sans être passée par `in_escrow`, c'est-
 * à-dire sans que le montant intégral ait été débité du chercheur.
 */
describe('EscrowOrder — paiement intégral obligatoire avant clôture (#276)', () => {
  it('markEscrowOrderDelivered refuse une commande jamais payée (awaiting_payment)', async () => {
    const conversationId = id()
    await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 5000 })

    const result = await markEscrowOrderDelivered(conversationId)

    expect(result).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('confirmEscrowOrderReceipt (qui libère les fonds vers le prestataire) refuse une commande jamais payée', async () => {
    const conversationId = id()
    await createEscrowOrder({ conversationId, clientId: id(), providerId: id(), amount: 5000 })

    const result = await confirmEscrowOrderReceipt(conversationId)

    expect(result).toEqual({ ok: false, error: 'invalid_status' })
  })

  it('un chercheur au solde insuffisant ne peut pas faire progresser la commande au-delà de "awaiting_payment"', async () => {
    const conversationId = id()
    const client = id()
    const provider = id()
    // Solde insuffisant : le crédit couvre moins que le montant de la commande.
    await creditWallet({ walletUserId: client, type: 'recharge', amount: 1000, reference: 'REF' })
    await createEscrowOrder({ conversationId, clientId: client, providerId: provider, amount: 5000 })

    expect(await markEscrowOrderDelivered(conversationId)).toEqual({ ok: false, error: 'invalid_status' })
    expect(await confirmEscrowOrderReceipt(conversationId)).toEqual({ ok: false, error: 'invalid_status' })
    expect(await getBalance(provider)).toBe(0)
  })
})
