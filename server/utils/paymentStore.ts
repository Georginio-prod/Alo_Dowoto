import type { Payment as PrismaPayment } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Persistance des paiements Mobile Money en base (Prisma/SQLite, #342,
 * ADR 0013, étape 2). Contrairement à l'ancien store en mémoire, les
 * paiements survivent aux redémarrages du serveur.
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

function toPayment(row: PrismaPayment): Payment {
  return {
    id: row.id,
    userId: row.userId,
    subscriptionId: row.subscriptionId,
    provider: row.provider as PaymentProvider,
    phone: row.phone,
    amount: row.amount,
    status: row.status as PaymentStatus,
    operatorRef: row.operatorRef,
    createdAt: row.createdAt.getTime(),
    resolvedAt: row.resolvedAt?.getTime() ?? null,
  }
}

export async function createPayment(input: {
  userId: string
  subscriptionId: string
  provider: PaymentProvider
  phone: string
  amount: number
}): Promise<Payment> {
  const row = await prisma.payment.create({
    data: {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      provider: input.provider,
      phone: input.phone,
      amount: input.amount,
    },
  })
  return toPayment(row)
}

export async function getPayment(id: string): Promise<Payment | null> {
  const row = await prisma.payment.findUnique({ where: { id } })
  return row ? toPayment(row) : null
}

/** Paiements confirmés d'un utilisateur, du plus récent au plus ancien (#363, historique téléchargeable). */
export async function listConfirmedPaymentsByUser(userId: string): Promise<Payment[]> {
  const rows = await prisma.payment.findMany({
    where: { userId, status: 'confirmed' },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toPayment)
}

/**
 * Applique le résultat d'une confirmation opérateur (webhook réel en prod,
 * simulation en dev — voir server/api/payments/initiate.post.ts).
 * Idempotent : un paiement déjà résolu n'est jamais réévalué. La résolution
 * est conditionnée par `where: { status: 'pending' }` pour rester correcte
 * même sous double envoi concurrent de l'opérateur (ce que la Map
 * mono-thread masquait auparavant).
 */
export async function resolvePayment(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Promise<Payment | null> {
  const existing = await prisma.payment.findUnique({ where: { id } })
  if (!existing) return null
  if (existing.status !== 'pending') return toPayment(existing)

  const result = await prisma.payment.updateMany({
    where: { id, status: 'pending' },
    data: { status, operatorRef: operatorRef ?? null, resolvedAt: new Date() },
  })
  // Un autre webhook concurrent a pu résoudre entre-temps : on relit l'état
  // effectif plutôt que de présumer du résultat.
  if (result.count === 0) {
    const current = await prisma.payment.findUnique({ where: { id } })
    return current ? toPayment(current) : null
  }
  const row = await prisma.payment.findUnique({ where: { id } })
  return row ? toPayment(row) : null
}
