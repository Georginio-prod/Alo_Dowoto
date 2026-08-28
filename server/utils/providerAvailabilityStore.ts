import type { UnavailabilityPeriod as PrismaUnavailabilityPeriod } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Calendrier de disponibilité côté prestataire (#290), désormais **persisté en
 * base** (Prisma/Postgres) — l'ancien store en mémoire est remplacé, les
 * périodes survivent aux redémarrages et deviennent lisibles par le backend
 * Express (ADR-0015/0017). Comportement observable **iso** : mêmes règles,
 * mêmes formes ; seules les lectures passent d'un accès synchrone à un accès
 * `async` (source = base).
 *
 * Un prestataire déclare des périodes où il n'est PAS disponible : par défaut,
 * sans période, il est toujours disponible (aucune régression pour l'annuaire
 * de démo ou les comptes n'ayant jamais touché cette fonctionnalité).
 *
 * `isProviderAvailableOn` est consommé par `providerDirectory.searchProviders`
 * (donc aussi par le moteur de matching via `requestStore.computeMatches`).
 */

export interface UnavailabilityPeriod {
  id: string
  providerId: string
  /** Dates au format ISO `AAAA-MM-JJ`, bornes incluses. */
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

/** Enregistre une période d'indisponibilité (#290). */
export async function addUnavailabilityPeriod(providerId: string, startDate: string, endDate: string): Promise<AddUnavailabilityResult> {
  if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(endDate)) return { ok: false, error: 'invalid_date' }
  if (endDate < startDate) return { ok: false, error: 'invalid_range' }

  const row = await prisma.unavailabilityPeriod.create({ data: { providerId, startDate, endDate } })
  return { ok: true, period: toPeriod(row) }
}

/** Supprime une période (le prestataire redevient disponible sur ces dates). Renvoie `true` si une période a été retirée. */
export async function removeUnavailabilityPeriod(providerId: string, periodId: string): Promise<boolean> {
  const { count } = await prisma.unavailabilityPeriod.deleteMany({ where: { id: periodId, providerId } })
  return count > 0
}

/** Périodes déclarées par ce prestataire, triées par date de début. */
export async function listUnavailabilityPeriods(providerId: string): Promise<UnavailabilityPeriod[]> {
  const rows = await prisma.unavailabilityPeriod.findMany({ where: { providerId }, orderBy: { startDate: 'asc' } })
  return rows.map(toPeriod)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Le prestataire apparaît-il dans les propositions pour cette date (#290) ?
 * `true` par défaut (aucune période déclarée), ce qui préserve le comportement
 * existant pour tout prestataire n'utilisant pas cette fonctionnalité.
 */
export async function isProviderAvailableOn(providerId: string, date: string): Promise<boolean> {
  const conflicting = await prisma.unavailabilityPeriod.count({
    where: { providerId, startDate: { lte: date }, endDate: { gte: date } },
  })
  return conflicting === 0
}
