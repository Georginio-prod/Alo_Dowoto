import type { UnavailabilityPeriod as PrismaUnavailabilityPeriod } from '@prisma/client'
import { availabilityRepository, type AvailabilityRepository } from '../repositories/availabilityRepository'

/**
 * Calendrier de disponibilité prestataire (#290). Logique **portée iso** depuis
 * `server/utils/providerAvailabilityStore.ts` (ADR-0016) : mêmes validations
 * (format ISO, ordre des bornes), même forme.
 */
export interface UnavailabilityPeriod {
  id: string
  providerId: string
  startDate: string
  endDate: string
  createdAt: number
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function toPeriod(row: PrismaUnavailabilityPeriod): UnavailabilityPeriod {
  return { id: row.id, providerId: row.providerId, startDate: row.startDate, endDate: row.endDate, createdAt: row.createdAt.getTime() }
}

export type AddUnavailabilityResult =
  | { ok: true; period: UnavailabilityPeriod }
  | { ok: false; error: 'invalid_date' | 'invalid_range' }

export function createAvailabilityService(repo: AvailabilityRepository = availabilityRepository) {
  return {
    async addUnavailabilityPeriod(providerId: string, startDate: string, endDate: string): Promise<AddUnavailabilityResult> {
      if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(endDate)) return { ok: false, error: 'invalid_date' }
      if (endDate < startDate) return { ok: false, error: 'invalid_range' }
      return { ok: true, period: toPeriod(await repo.create(providerId, startDate, endDate)) }
    },
    removeUnavailabilityPeriod(providerId: string, periodId: string): Promise<boolean> {
      return repo.remove(providerId, periodId)
    },
    async listUnavailabilityPeriods(providerId: string): Promise<UnavailabilityPeriod[]> {
      return (await repo.listByProvider(providerId)).map(toPeriod)
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const availabilityService = createAvailabilityService()
