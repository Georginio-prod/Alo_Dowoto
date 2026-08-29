import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient, WalletMovement as PrismaWalletMovement } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Journal du portefeuille interne (`prisma.walletMovement`). Porté iso depuis
 * `server/utils/walletStore.ts` (ADR-0016), déjà persisté en base (ADR-0013).
 * Le solde n'est **jamais stocké** : toujours recalculé depuis le journal
 * (critère #192). Journal append-only : aucune fonction ne modifie/supprime un
 * mouvement existant. Client Prisma injecté (testable sans base).
 *
 * Depuis le portage du domaine séquestre (conversations/escrow), ce journal
 * porte aussi les primitives de crédit/débit utilisées par les commandes en
 * séquestre (`creditWallet`/`debitWallet`/`debitWalletForPenalty` iso Nitro).
 * `getBalance` somme **tous** les types (escrow_release, commission, etc.).
 * Un `tx` optionnel (#366) permet de composer un mouvement et un changement de
 * statut de commande dans une **seule** transaction atomique (jamais de
 * double-débit / double-paiement sur panne).
 */

/** Identifiant conventionnel du portefeuille interne WorkTogo (commissions) — iso `walletStore`. */
export const PLATFORM_WALLET_USER_ID = 'worktogo-platform'
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

/**
 * Construit les données d'un mouvement. Horodatage applicatif (et non
 * `@default(now())` base) : ordre déterministe même pour des insertions
 * rapprochées, sensible à un mock de `Date.now` dans les tests. Iso `walletStore`.
 */
function buildMovementData(input: RecordMovementInput): Prisma.WalletMovementCreateInput {
  return {
    id: randomUUID(),
    walletUserId: input.walletUserId,
    type: input.type,
    amount: input.amount,
    reference: input.reference,
    counterpartyUserId: input.counterpartyUserId ?? null,
    createdAt: new Date(Date.now()),
  }
}

export type RequestWithdrawalResult =
  | { ok: true; movement: WalletMovement }
  | { ok: false; error: 'insufficient_funds' }

/**
 * Client Prisma accepté par les primitives de portefeuille : soit le singleton
 * partagé, soit le client transactionnel `tx` fourni par un `$transaction`
 * appelant (voir `escrowOrderRepository.transaction`). Permet d'écrire un
 * mouvement dans la transaction d'une opération métier composite (#366).
 */
export type WalletDb = Prisma.TransactionClient

export interface RecordMovementInput {
  walletUserId: string
  type: WalletMovementType
  amount: number
  reference: string
  counterpartyUserId?: string | null
}

export interface WalletMovementRepository {
  listByUser(userId: string): Promise<WalletMovement[]>
  findById(id: string): Promise<WalletMovement | null>
  getBalance(userId: string): Promise<number>
  /** Crédite une recharge confirmée (append-only, mouvement `recharge`). */
  creditRecharge(userId: string, amount: number, reference: string): Promise<WalletMovement>
  /**
   * Crédite un mouvement générique (append-only) — iso `walletStore.creditWallet`.
   * Refuse un `escrow_debit` (débit) et un montant ≤ 0. Utilisé notamment par le
   * bonus de parrainage (`referral_bonus`, #365) à la confirmation d'un paiement,
   * et par le séquestre (libération, remboursement, compensation). `tx` (#366)
   * permet de l'inscrire dans la transaction d'une opération métier composite.
   */
  credit(input: RecordMovementInput, tx?: WalletDb): Promise<WalletMovement>
  /**
   * Débite le portefeuille (mise en séquestre, `escrow_debit`). Renvoie `null`
   * si le solde est insuffisant — le mouvement n'est alors pas journalisé. La
   * vérification du solde et l'écriture sont encadrées par une transaction (ou
   * réutilisent `tx` s'il est fourni). Iso `walletStore.debitWallet`.
   */
  debit(input: Omit<RecordMovementInput, 'type'>, tx?: WalletDb): Promise<WalletMovement | null>
  /**
   * Débite au titre d'une pénalité (`dispute_penalty`) — ne renvoie jamais
   * `null` sur solde insuffisant : le montant est plafonné au solde disponible
   * (jamais de découvert) et le mouvement effectif est renvoyé, ou `null` si le
   * solde est nul. Iso `walletStore.debitWalletForPenalty`.
   */
  debitForPenalty(input: Omit<RecordMovementInput, 'type'>, tx?: WalletDb): Promise<WalletMovement | null>
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
    async credit(input, tx) {
      if (input.type === 'escrow_debit') throw new Error('credit ne doit pas recevoir de mouvement escrow_debit.')
      if (input.amount <= 0) throw new Error('Le montant crédité doit être positif.')
      const client = tx ?? db
      const row = await client.walletMovement.create({ data: buildMovementData(input) })
      return toMovement(row)
    },
    async debit(input, tx) {
      if (input.amount <= 0) throw new Error('Le montant débité doit être positif.')
      const movementInput: RecordMovementInput = { ...input, type: 'escrow_debit' }
      // Vérifie le solde puis journalise le débit sur le client fourni. Encadré
      // par une transaction quand aucune n'est déjà en cours : deux débits
      // concurrents ne peuvent plus créer de découvert (iso `walletStore`).
      const performDebit = async (client: WalletDb): Promise<WalletMovement | null> => {
        const rows = await client.walletMovement.findMany({ where: { walletUserId: input.walletUserId }, select: { amount: true, type: true } })
        if (sumBalance(rows) < input.amount) return null
        const row = await client.walletMovement.create({ data: buildMovementData(movementInput) })
        return toMovement(row)
      }
      if (tx) return performDebit(tx)
      return db.$transaction((client) => performDebit(client))
    },
    async debitForPenalty(input, tx) {
      if (input.amount <= 0) throw new Error('Le montant de la pénalité doit être positif.')
      const applyPenalty = async (client: WalletDb): Promise<WalletMovement | null> => {
        const rows = await client.walletMovement.findMany({ where: { walletUserId: input.walletUserId }, select: { amount: true, type: true } })
        const balance = sumBalance(rows)
        if (balance <= 0) return null
        const amount = Math.min(input.amount, balance)
        const row = await client.walletMovement.create({ data: buildMovementData({ ...input, type: 'dispute_penalty', amount }) })
        return toMovement(row)
      }
      if (tx) return applyPenalty(tx)
      return db.$transaction((client) => applyPenalty(client))
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
