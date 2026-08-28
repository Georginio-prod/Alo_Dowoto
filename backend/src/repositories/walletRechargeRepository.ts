import type { PrismaClient, WalletRecharge as PrismaWalletRecharge } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Recharges du portefeuille via mobile money (`prisma.walletRecharge`). Porté iso
 * depuis `server/utils/walletRechargeStore.ts` (ADR-0016), déjà persisté en base
 * (ADR-0013). Le montant n'est crédité qu'une fois la recharge confirmée — la
 * mécanique de crédit vit dans le service (orchestration), le repository ne fait
 * que les accès bruts. Client Prisma injecté.
 */
export type WalletRechargeProvider = 'flooz' | 'tmoney'
export type WalletRechargeStatus = 'pending' | 'confirmed' | 'failed'

export interface WalletRecharge {
  id: string
  userId: string
  provider: WalletRechargeProvider
  phone: string
  amount: number
  status: WalletRechargeStatus
  operatorRef: string | null
  createdAt: number
  resolvedAt: number | null
}

function toRecharge(row: PrismaWalletRecharge): WalletRecharge {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider as WalletRechargeProvider,
    phone: row.phone,
    amount: row.amount,
    status: row.status as WalletRechargeStatus,
    operatorRef: row.operatorRef,
    createdAt: row.createdAt.getTime(),
    resolvedAt: row.resolvedAt?.getTime() ?? null,
  }
}

export interface CreateRechargeInput {
  userId: string
  provider: WalletRechargeProvider
  phone: string
  amount: number
}

export interface WalletRechargeRepository {
  create(input: CreateRechargeInput): Promise<WalletRecharge>
  findById(id: string): Promise<WalletRecharge | null>
  /**
   * Passe une recharge `pending` à `confirmed`/`failed` (idempotent via
   * `where: { status: 'pending' }`) et renvoie le nombre de lignes affectées :
   * 0 = déjà résolue par un envoi concurrent. Ne crédite PAS le portefeuille
   * (c'est l'orchestration du service qui le fait après un passage réussi).
   */
  markResolved(id: string, status: 'confirmed' | 'failed', operatorRef?: string): Promise<number>
}

export function createWalletRechargeRepository(db: PrismaClient): WalletRechargeRepository {
  return {
    async create(input) {
      const row = await db.walletRecharge.create({
        data: { userId: input.userId, provider: input.provider, phone: input.phone, amount: input.amount },
      })
      return toRecharge(row)
    },
    async findById(id) {
      const row = await db.walletRecharge.findUnique({ where: { id } })
      return row ? toRecharge(row) : null
    },
    async markResolved(id, status, operatorRef) {
      const result = await db.walletRecharge.updateMany({
        where: { id, status: 'pending' },
        data: { status, operatorRef: operatorRef ?? null, resolvedAt: new Date() },
      })
      return result.count
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const walletRechargeRepository = createWalletRechargeRepository(prisma)
