import type { PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/** Compteur persistant atomique par utilisateur, portée et mois. */
export interface MonthlyUsageRepository {
  get(userId: string, scope: string, month: string): Promise<number>
  increment(userId: string, scope: string, month: string): Promise<number>
}

export function createMonthlyUsageRepository(db: PrismaClient): MonthlyUsageRepository {
  return {
    async get(userId, scope, month) {
      const row = await db.monthlyUsageCounter.findUnique({ where: { userId_scope_month: { userId, scope, month } } })
      return row?.count ?? 0
    },
    async increment(userId, scope, month) {
      const row = await db.monthlyUsageCounter.upsert({
        where: { userId_scope_month: { userId, scope, month } },
        create: { userId, scope, month, count: 1 },
        update: { count: { increment: 1 } },
      })
      return row.count
    },
  }
}

export const monthlyUsageRepository = createMonthlyUsageRepository(prisma)
