import type { PrismaClient, UnavailabilityPeriod } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données du calendrier de disponibilité (`prisma.unavailabilityPeriod`,
 * #290). Porté iso depuis `server/utils/providerAvailabilityStore.ts` (ADR-0016).
 * Client Prisma injecté ; les règles (format/ordre des dates) restent au service.
 */
export interface AvailabilityRepository {
  create(providerId: string, startDate: string, endDate: string): Promise<UnavailabilityPeriod>
  /** Supprime une période appartenant au prestataire ; renvoie `true` si retirée. */
  remove(providerId: string, periodId: string): Promise<boolean>
  /** Périodes du prestataire, triées par date de début. */
  listByProvider(providerId: string): Promise<UnavailabilityPeriod[]>
}

export function createAvailabilityRepository(db: PrismaClient): AvailabilityRepository {
  return {
    create(providerId, startDate, endDate) {
      return db.unavailabilityPeriod.create({ data: { providerId, startDate, endDate } })
    },
    async remove(providerId, periodId) {
      const { count } = await db.unavailabilityPeriod.deleteMany({ where: { id: periodId, providerId } })
      return count > 0
    },
    listByProvider(providerId) {
      return db.unavailabilityPeriod.findMany({ where: { providerId }, orderBy: { startDate: 'asc' } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const availabilityRepository = createAvailabilityRepository(prisma)
