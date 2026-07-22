import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { conflict } from '~~/server/utils/apiError'
import { createPayment, getPayment, resolvePayment } from '~~/server/utils/paymentStore'
import { createPendingSubscription } from '~~/server/utils/subscriptionStore'
import { findOrCreateUser, type NewUserProfile } from '~~/server/utils/userStore'

/**
 * createPendingSubscription appelle le helper auto-importé `conflict`, absent
 * sous vitest — on le rebranche (même approche que subscriptionStore.test.ts).
 */
beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode?: number, message?: string }) =>
    Object.assign(new Error(input.message ?? 'error'), input))
  vi.stubGlobal('conflict', conflict)
})

const PROFILE: NewUserProfile = {
  username: 'pay-test',
  firstName: 'Pay',
  lastName: 'Test',
  location: 'Lomé',
}

/**
 * Depuis la bascule sur Prisma (#342, ADR 0013, étape 2), un paiement référence
 * un vrai compte et un vrai abonnement (FK `Payment.userId → User` et
 * `Payment.subscriptionId → Subscription`). Chaque paiement de test crée donc
 * les entités liées réelles, comme en production.
 */
let counter = 0
async function newPayment() {
  counter += 1
  const { user } = await findOrCreateUser(`+228${Date.now()}${counter}`, 'prestataire', PROFILE)
  const subscription = await createPendingSubscription(user.id, 'mensuel')
  return createPayment({
    userId: user.id,
    subscriptionId: subscription.id,
    provider: 'flooz',
    phone: '+22890000000',
    amount: 2500,
  })
}

describe('paymentStore (#32/#34 paiements Mobile Money)', () => {
  it('createPayment crée un paiement en attente, sans référence opérateur', async () => {
    const payment = await newPayment()
    expect(payment.status).toBe('pending')
    expect(payment.operatorRef).toBeNull()
    expect(payment.resolvedAt).toBeNull()
    expect(payment.amount).toBe(2500)
    expect((await getPayment(payment.id))?.id).toBe(payment.id)
  })

  it('getPayment renvoie null pour un identifiant inconnu', async () => {
    expect(await getPayment(randomUUID())).toBeNull()
  })

  it('resolvePayment confirme un paiement en attente et enregistre la référence opérateur', async () => {
    const payment = await newPayment()
    const resolved = await resolvePayment(payment.id, 'confirmed', 'OP-123')
    expect(resolved?.status).toBe('confirmed')
    expect(resolved?.operatorRef).toBe('OP-123')
    expect(resolved?.resolvedAt).not.toBeNull()
  })

  it('resolvePayment marque un échec (operatorRef null si absent)', async () => {
    const payment = await newPayment()
    const resolved = await resolvePayment(payment.id, 'failed')
    expect(resolved?.status).toBe('failed')
    expect(resolved?.operatorRef).toBeNull()
  })

  it('resolvePayment est idempotent : un paiement déjà résolu n’est jamais réévalué', async () => {
    const payment = await newPayment()
    await resolvePayment(payment.id, 'confirmed', 'OP-1')
    const second = await resolvePayment(payment.id, 'failed', 'OP-2')
    // Reste confirmé avec sa première référence, malgré le second appel.
    expect(second?.status).toBe('confirmed')
    expect(second?.operatorRef).toBe('OP-1')
  })

  it('resolvePayment renvoie null pour un identifiant inconnu', async () => {
    expect(await resolvePayment(randomUUID(), 'confirmed')).toBeNull()
  })
})
