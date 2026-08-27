import type { PrismaClient, Subscription } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des abonnements (`prisma.subscription`). Porté iso depuis
 * `server/utils/subscriptionStore.ts` (ADR-0016). Client Prisma injecté ; les
 * règles métier (conflit d'abonnement actif, essai réservé à la 1re
 * souscription) restent dans le service.
 */
export interface SubscriptionRepository {
  findByUserId(userId: string): Promise<Subscription | null>
  update(id: string, data: Parameters<PrismaClient['subscription']['update']>[0]['data']): Promise<Subscription>
  create(data: Parameters<PrismaClient['subscription']['create']>[0]['data']): Promise<Subscription>
}

export function createSubscriptionRepository(db: PrismaClient): SubscriptionRepository {
  return {
    findByUserId(userId) {
      return db.subscription.findFirst({ where: { userId } })
    },
    update(id, data) {
      return db.subscription.update({ where: { id }, data })
    },
    create(data) {
      return db.subscription.create({ data })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const subscriptionRepository = createSubscriptionRepository(prisma)
