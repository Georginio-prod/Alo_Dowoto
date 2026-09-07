import type { FraudAlert, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

export interface CreateFraudAlertInput {
  clientId: string
  providerId: string
  reason: string
  amount: number
}

export interface FraudAlertRepository {
  create(input: CreateFraudAlertInput): Promise<FraudAlert>
  list(): Promise<FraudAlert[]>
}

export function createFraudAlertRepository(db: PrismaClient): FraudAlertRepository {
  return {
    create(input) {
      return db.fraudAlert.create({ data: input })
    },
    list() {
      return db.fraudAlert.findMany({ orderBy: { createdAt: 'desc' } })
    },
  }
}

export const fraudAlertRepository = createFraudAlertRepository(prisma)
