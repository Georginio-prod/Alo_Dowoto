import { randomUUID } from 'node:crypto'
import type { PrismaClient, WalletMovement as PrismaWalletMovement } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Journal du portefeuille interne (`prisma.walletMovement`). Porté iso depuis
 * `server/utils/walletStore.ts` (ADR-0016), déjà persisté en base (ADR-0013).
 * Le solde n'est **jamais stocké** : toujours recalculé depuis le journal
 * (critère #192). Journal append-only : aucune fonction ne modifie/supprime un
 * mouvement existant. Client Prisma injecté (testable sans base).
 *
 * Le backend ne porte pour l'instant que les ROUTES du portefeuille (solde,
 * mouvements, recharge, retrait) ; l'écriture des mouvements d'escrow reste côté
 * Nitro tant que ce domaine n'est pas porté. Seuls les mouvements utiles à ces
 * routes sont exposés ici — mais `getBalance` somme bien **tous** les types
 * (un solde inclut escrow_release, commission, etc. écrits par ailleurs).
 */
export type WalletMovementType =
  | 'recharge'
  | 'escrow_debit'
  | 'escrow_release'
  | 'escrow_refund'
  | 'commission'
  | 'retrait'
  | 'cancellation_compensation'
  | 'dispute_penalty'
  | 'dispute_compensation'
  | 'referral_bonus'

export interface WalletMovement {
  id: string
  walletUserId: string
  type: WalletMovementType
  amount: number
  reference: string
  counterpartyUserId: string | null
  createdAt: number
}

/** Signe appliqué au solde du titulaire (`escrow_debit`/`retrait` retirent). */
const MOVEMENT_SIGN: Record<WalletMovementType, 1 | -1> = {
  recharge: 1,
  escrow_debit: -1,
  escrow_release: 1,
  escrow_refund: 1,
  commission: 1,
  retrait: -1,
  cancellation_compensation: 1,
  dispute_penalty: -1,
  dispute_compensation: 1,
  referral_bonus: 1,
}

function toMovement(row: PrismaWalletMovement): WalletMovement {
  return {
    id: row.id,
    walletUserId: row.walletUserId,
    type: row.type as WalletMovementType,
    amount: row.amount,
    reference: row.reference,
    counterpartyUserId: row.counterpartyUserId,
    createdAt: row.createdAt.getTime(),
  }
}

function sumBalance(rows: Pick<PrismaWalletMovement, 'amount' | 'type'>[]): number {
  return rows.reduce((total, m) => total + m.amount * MOVEMENT_SIGN[m.type as WalletMovementType], 0)
}

export type RequestWithdrawalResult =
  | { ok: true; movement: WalletMovement }
  | { ok: false; error: 'insufficient_funds' }

export interface WalletMovementRepository {
  listByUser(userId: string): Promise<WalletMovement[]>
  findById(id: string): Promise<WalletMovement | null>
  getBalance(userId: string): Promise<number>
  /** Crédite une recharge confirmée (append-only, mouvement `recharge`). */
  creditRecharge(userId: string, amount: number, reference: string): Promise<WalletMovement>
  /**
   * Crédite un mouvement générique (append-only) — iso `walletStore.creditWallet`.
   * Refuse un `escrow_debit` (débit) et un montant ≤ 0. Utilisé notamment par le
   * bonus de parrainage (`referral_bonus`, #365) à la confirmation d'un paiement.
   */
  credit(input: { walletUserId: string; type: WalletMovementType; amount: number; reference: string; counterpartyUserId?: string | null }): Promise<WalletMovement>
  /** Débite un retrait `retrait` si le solde suffit — transaction atomique (#366). */
  requestWithdrawal(userId: string, amount: number): Promise<RequestWithdrawalResult>
}

export function createWalletMovementRepository(db: PrismaClient): WalletMovementRepository {
  return {
    async listByUser(userId) {
      const rows = await db.walletMovement.findMany({ where: { walletUserId: userId }, orderBy: { createdAt: 'desc' } })
      return rows.map(toMovement)
    },
    async findById(id) {
      const row = await db.walletMovement.findUnique({ where: { id } })
      return row ? toMovement(row) : null
    },
    async getBalance(userId) {
      const rows = await db.walletMovement.findMany({ where: { walletUserId: userId }, select: { amount: true, type: true } })
      return sumBalance(rows)
    },
    async creditRecharge(userId, amount, reference) {
      // Horodatage applicatif (et non `@default(now())`) : ordre déterministe
      // même pour des insertions rapprochées, sensible à un mock de `Date.now`.
      const row = await db.walletMovement.create({
        data: { id: randomUUID(), walletUserId: userId, type: 'recharge', amount, reference, createdAt: new Date(Date.now()) },
      })
      return toMovement(row)
    },
    async credit(input) {
      if (input.type === 'escrow_debit') throw new Error('credit ne doit pas recevoir de mouvement escrow_debit.')
      if (input.amount <= 0) throw new Error('Le montant crédité doit être positif.')
      const row = await db.walletMovement.create({
        data: {
          id: randomUUID(),
          walletUserId: input.walletUserId,
          type: input.type,
          amount: input.amount,
          reference: input.reference,
          counterpartyUserId: input.counterpartyUserId ?? null,
          createdAt: new Date(Date.now()),
        },
      })
      return toMovement(row)
    },
    async requestWithdrawal(userId, amount) {
      const movement = await db.$transaction(async (tx) => {
        const rows = await tx.walletMovement.findMany({ where: { walletUserId: userId }, select: { amount: true, type: true } })
        if (sumBalance(rows) < amount) return null
        const row = await tx.walletMovement.create({
          data: { id: randomUUID(), walletUserId: userId, type: 'retrait', amount, reference: randomUUID(), createdAt: new Date(Date.now()) },
        })
        return toMovement(row)
      })
      if (!movement) return { ok: false, error: 'insufficient_funds' }
      return { ok: true, movement }
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const walletMovementRepository = createWalletMovementRepository(prisma)
