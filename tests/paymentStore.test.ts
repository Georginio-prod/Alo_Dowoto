import { describe, expect, it } from 'vitest'
import { createPayment, getPayment, resolvePayment } from '~~/server/utils/paymentStore'

function newPayment() {
  return createPayment({
    userId: 'user-1',
    subscriptionId: 'sub-1',
    provider: 'flooz',
    phone: '+22890000000',
    amount: 2500,
  })
}

describe('paymentStore (#32/#34 paiements Mobile Money)', () => {
  it('createPayment crée un paiement en attente, sans référence opérateur', () => {
    const payment = newPayment()
    expect(payment.status).toBe('pending')
    expect(payment.operatorRef).toBeNull()
    expect(payment.resolvedAt).toBeNull()
    expect(payment.amount).toBe(2500)
    expect(getPayment(payment.id)?.id).toBe(payment.id)
  })

  it('getPayment renvoie null pour un identifiant inconnu', () => {
    expect(getPayment('inexistant')).toBeNull()
  })

  it('resolvePayment confirme un paiement en attente et enregistre la référence opérateur', () => {
    const payment = newPayment()
    const resolved = resolvePayment(payment.id, 'confirmed', 'OP-123')
    expect(resolved?.status).toBe('confirmed')
    expect(resolved?.operatorRef).toBe('OP-123')
    expect(resolved?.resolvedAt).not.toBeNull()
  })

  it('resolvePayment marque un échec (operatorRef null si absent)', () => {
    const payment = newPayment()
    const resolved = resolvePayment(payment.id, 'failed')
    expect(resolved?.status).toBe('failed')
    expect(resolved?.operatorRef).toBeNull()
  })

  it('resolvePayment est idempotent : un paiement déjà résolu n’est jamais réévalué', () => {
    const payment = newPayment()
    resolvePayment(payment.id, 'confirmed', 'OP-1')
    const second = resolvePayment(payment.id, 'failed', 'OP-2')
    // Reste confirmé avec sa première référence, malgré le second appel.
    expect(second?.status).toBe('confirmed')
    expect(second?.operatorRef).toBe('OP-1')
  })

  it('resolvePayment renvoie null pour un identifiant inconnu', () => {
    expect(resolvePayment('inexistant', 'confirmed')).toBeNull()
  })
})
