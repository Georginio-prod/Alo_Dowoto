import { randomUUID } from 'node:crypto'

/**
 * Store en mémoire pour les paiements Mobile Money. Suffisant pour ce lot
 * (pas de base de données encore en place, voir #45/#46).
 */

export type PaymentProvider = 'flooz' | 'tmoney'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed'

export interface Payment {
  id: string
  userId: string
  subscriptionId: string
  provider: PaymentProvider
  phone: string
  amount: number
  status: PaymentStatus
  operatorRef: string | null
  createdAt: number
  resolvedAt: number | null
}

const payments = new Map<string, Payment>()

export function createPayment(input: {
  userId: string
  subscriptionId: string
  provider: PaymentProvider
  phone: string
  amount: number
}): Payment {
  const payment: Payment = {
    id: randomUUID(),
    userId: input.userId,
    subscriptionId: input.subscriptionId,
    provider: input.provider,
    phone: input.phone,
    amount: input.amount,
    status: 'pending',
    operatorRef: null,
    createdAt: Date.now(),
    resolvedAt: null,
  }
  payments.set(payment.id, payment)
  return payment
}

export function getPayment(id: string): Payment | null {
  return payments.get(id) ?? null
}

/**
 * Applique le résultat d'une confirmation opérateur (webhook réel en prod,
 * simulation en dev — voir server/api/payments/initiate.post.ts).
 * Idempotent : un paiement déjà résolu n'est jamais réévalué.
 */
export function resolvePayment(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Payment | null {
  const payment = payments.get(id)
  if (!payment || payment.status !== 'pending') return payment ?? null

  payment.status = status
  payment.operatorRef = operatorRef ?? null
  payment.resolvedAt = Date.now()
  return payment
}
