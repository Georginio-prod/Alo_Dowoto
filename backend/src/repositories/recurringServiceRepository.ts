import type { PrismaClient, RecurringService as PrismaRecurringService } from '@prisma/client'
import { prisma } from '../config/prisma'

export interface StoredRecurringService {
  id: string
  conversationId: string
  clientId: string
  providerId: string
  amount: number
  frequency: string
  status: string
  createdAt: number
  lastChargedAt: number | null
  nextChargeAt: number
  cancelledAt: number | null
}

function toService(row: PrismaRecurringService): StoredRecurringService {
  return {
    id: row.id,
    conversationId: row.conversationId,
    clientId: row.clientId,
    providerId: row.providerId,
    amount: row.amount,
    frequency: row.frequency,
    status: row.status,
    createdAt: row.createdAt.getTime(),
    lastChargedAt: row.lastChargedAt?.getTime() ?? null,
    nextChargeAt: row.nextChargeAt.getTime(),
    cancelledAt: row.cancelledAt?.getTime() ?? null,
  }
}

export interface RecurringServiceRepository {
  findByConversationId(conversationId: string): Promise<StoredRecurringService | null>
  upsert(service: StoredRecurringService): Promise<StoredRecurringService>
  update(id: string, update: Pick<StoredRecurringService, 'status' | 'lastChargedAt' | 'nextChargeAt' | 'cancelledAt'>): Promise<StoredRecurringService>
}

export function createRecurringServiceRepository(db: PrismaClient): RecurringServiceRepository {
  return {
    async findByConversationId(conversationId) {
      const row = await db.recurringService.findUnique({ where: { conversationId } })
      return row ? toService(row) : null
    },
    async upsert(service) {
      const data = {
        clientId: service.clientId,
        providerId: service.providerId,
        amount: service.amount,
        frequency: service.frequency,
        status: service.status,
        lastChargedAt: service.lastChargedAt === null ? null : new Date(service.lastChargedAt),
        nextChargeAt: new Date(service.nextChargeAt),
        cancelledAt: service.cancelledAt === null ? null : new Date(service.cancelledAt),
      }
      const row = await db.recurringService.upsert({
        where: { conversationId: service.conversationId },
        create: { id: service.id, conversationId: service.conversationId, createdAt: new Date(service.createdAt), ...data },
        update: data,
      })
      return toService(row)
    },
    async update(id, update) {
      const row = await db.recurringService.update({
        where: { id },
        data: {
          status: update.status,
          lastChargedAt: update.lastChargedAt === null ? null : new Date(update.lastChargedAt),
          nextChargeAt: new Date(update.nextChargeAt),
          cancelledAt: update.cancelledAt === null ? null : new Date(update.cancelledAt),
        },
      })
      return toService(row)
    },
  }
}

export const recurringServiceRepository = createRecurringServiceRepository(prisma)
