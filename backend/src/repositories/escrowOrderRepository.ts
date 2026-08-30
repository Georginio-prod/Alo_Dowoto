import type { EscrowOrder as PrismaEscrowOrder, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des commandes en séquestre (`prisma.escrowOrder`). Porté iso
 * depuis `server/utils/escrowOrderStore.ts` (ADR-0016), déjà persisté en base
 * (ADR-0013). Client Prisma injecté (testable sans base).
 *
 * Ce repository expose l'accès CRUD brut **et** un helper `transaction` qui
 * encapsule `$transaction` (Prisma reste confiné à la couche données) : le
 * service séquestre l'utilise pour composer, dans une seule transaction
 * atomique (#366), un mouvement de portefeuille (`walletMovementRepository`,
 * qui accepte le même client `tx`) et un changement de statut de commande —
 * plus jamais de double-débit / double-paiement sur panne.
 */

export type EscrowOrderStatus = 'awaiting_payment' | 'in_escrow' | 'delivered' | 'released' | 'refunded' | 'disputed'

export interface EscrowOrder {
  id: string
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  status: EscrowOrderStatus
  createdAt: number
  paidAt: number | null
  deliveredAt: number | null
  releasedAt: number | null
  cancelledAt: number | null
  cancelReason: string | null
  disputedAt: number | null
  disputeReason: string | null
  disputeEvidence: string | null
  disputeResponse: string | null
  disputeRespondedAt: number | null
  checkInAt: number | null
  checkInLocation: { lat: number; lng: number } | null
  checkOutAt: number | null
  checkOutLocation: { lat: number; lng: number } | null
}

export function toOrder(row: PrismaEscrowOrder): EscrowOrder {
  return {
    id: row.id,
    conversationId: row.conversationId,
    clientId: row.clientId,
    providerId: row.providerId,
    amount: row.amount,
    status: row.status as EscrowOrderStatus,
    createdAt: row.createdAt.getTime(),
    paidAt: row.paidAt?.getTime() ?? null,
    deliveredAt: row.deliveredAt?.getTime() ?? null,
    releasedAt: row.releasedAt?.getTime() ?? null,
    cancelledAt: row.cancelledAt?.getTime() ?? null,
    cancelReason: row.cancelReason,
    disputedAt: row.disputedAt?.getTime() ?? null,
    disputeReason: row.disputeReason,
    disputeEvidence: row.disputeEvidence,
    disputeResponse: row.disputeResponse,
    disputeRespondedAt: row.disputeRespondedAt?.getTime() ?? null,
    checkInAt: row.checkInAt?.getTime() ?? null,
    checkInLocation: row.checkInLat !== null && row.checkInLng !== null ? { lat: row.checkInLat, lng: row.checkInLng } : null,
    checkOutAt: row.checkOutAt?.getTime() ?? null,
    checkOutLocation: row.checkOutLat !== null && row.checkOutLng !== null ? { lat: row.checkOutLat, lng: row.checkOutLng } : null,
  }
}

export interface CreateEscrowOrderInput {
  conversationId: string
  clientId: string
  providerId: string
  amount: number
}

export interface EscrowOrderRepository {
  findByConversationId(conversationId: string): Promise<EscrowOrder | null>
  findById(id: string): Promise<EscrowOrder | null>
  findByClientAndProvider(clientId: string, providerId: string): Promise<EscrowOrder[]>
  create(input: CreateEscrowOrderInput): Promise<EscrowOrder>
  deleteById(id: string): Promise<void>
  /** Met à jour une commande sur le client `tx` fourni (transactionnel ou non). */
  update(id: string, data: Prisma.EscrowOrderUpdateInput, tx?: Prisma.TransactionClient): Promise<EscrowOrder>
  /** Nombre de commandes `awaiting_payment` pour ce chercheur (#280). */
  countUnpaidForClient(clientId: string): Promise<number>
  /** Horodatages de création des commandes de ce chercheur, tous statuts (#277). */
  recentTimestampsForClient(clientId: string): Promise<number[]>
  /** Commandes en litige en attente d'arbitrage (#197/#274). */
  listDisputed(): Promise<EscrowOrder[]>
  /** Lecture brute d'une commande **dans** la transaction, pour la garde d'idempotence. */
  findByIdIn(tx: Prisma.TransactionClient, id: string): Promise<EscrowOrder | null>
  /** Encapsule `$transaction` — Prisma reste dans la couche données (#366). */
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>
}

export function createEscrowOrderRepository(db: PrismaClient): EscrowOrderRepository {
  return {
    async findByConversationId(conversationId) {
      const row = await db.escrowOrder.findUnique({ where: { conversationId } })
      return row ? toOrder(row) : null
    },
    async findById(id) {
      const row = await db.escrowOrder.findUnique({ where: { id } })
      return row ? toOrder(row) : null
    },
    async findByClientAndProvider(clientId, providerId) {
      const rows = await db.escrowOrder.findMany({ where: { clientId, providerId } })
      return rows.map(toOrder)
    },
    async create(input) {
      const row = await db.escrowOrder.create({
        data: {
          conversationId: input.conversationId,
          clientId: input.clientId,
          providerId: input.providerId,
          amount: input.amount,
          status: 'awaiting_payment',
        },
      })
      return toOrder(row)
    },
    async deleteById(id) {
      await db.escrowOrder.delete({ where: { id } })
    },
    async update(id, data, tx) {
      const client = tx ?? db
      return toOrder(await client.escrowOrder.update({ where: { id }, data }))
    },
    countUnpaidForClient(clientId) {
      return db.escrowOrder.count({ where: { clientId, status: 'awaiting_payment' } })
    },
    async recentTimestampsForClient(clientId) {
      const rows = await db.escrowOrder.findMany({ where: { clientId }, select: { createdAt: true } })
      return rows.map((row) => row.createdAt.getTime())
    },
    async listDisputed() {
      const rows = await db.escrowOrder.findMany({ where: { status: 'disputed' } })
      return rows.map(toOrder)
    },
    async findByIdIn(tx, id) {
      const row = await tx.escrowOrder.findUnique({ where: { id } })
      return row ? toOrder(row) : null
    },
    transaction(fn) {
      return db.$transaction(fn)
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const escrowOrderRepository = createEscrowOrderRepository(prisma)
