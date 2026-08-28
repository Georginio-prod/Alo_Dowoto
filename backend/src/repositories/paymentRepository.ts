import type { PrismaClient, Payment as PrismaPayment } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Paiements d'abonnement Mobile Money (`prisma.payment`). Porté iso depuis
 * `server/utils/paymentStore.ts` (ADR-0016), déjà persisté en base (ADR-0013).
 * Même mécanique que `walletRechargeRepository` : le montant n'active
 * l'abonnement qu'une fois le paiement confirmé (orchestré par le service).
 * Client Prisma injecté.
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

export interface CreatePaymentInput {
  userId: string
  subscriptionId: string
  provider: PaymentProvider
  phone: string
  amount: number
}

export interface PaymentRepository {
  create(input: CreatePaymentInput): Promise<Payment>
  findById(id: string): Promise<Payment | null>
  /** Paiements confirmés d'un utilisateur, du plus récent au plus ancien (#363). */
  listConfirmedByUser(userId: string): Promise<Payment[]>
  /** Passe un paiement `pending` à `confirmed`/`failed` (idempotent) ; renvoie le nb de lignes affectées. */
  markResolved(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Promise<number>
}

export function createPaymentRepository(db: PrismaClient): PaymentRepository {
  return {
    async create(input) {
      const row = await db.payment.create({
        data: {
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          provider: input.provider,
          phone: input.phone,
          amount: input.amount,
        },
      })
      return toPayment(row)
    },
    async findById(id) {
      const row = await db.payment.findUnique({ where: { id } })
      return row ? toPayment(row) : null
    },
    async listConfirmedByUser(userId) {
      const rows = await db.payment.findMany({ where: { userId, status: 'confirmed' }, orderBy: { createdAt: 'desc' } })
      return rows.map(toPayment)
    },
    async markResolved(id, status, operatorRef) {
      const result = await db.payment.updateMany({
        where: { id, status: 'pending' },
        data: { status, operatorRef: operatorRef ?? null, resolvedAt: new Date() },
      })
      return result.count
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const paymentRepository = createPaymentRepository(prisma)
