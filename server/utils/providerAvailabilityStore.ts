import { randomUUID } from 'node:crypto'

/**
 * Calendrier de disponibilité en temps réel côté prestataire (#290). En
 * mémoire, comme les autres stores (pas de base de données encore en place,
 * voir #45/#46). Un prestataire déclare des périodes où il n'est PAS
 * disponible (plutôt que l'inverse) : par défaut, sans période déclarée, un
 * prestataire est toujours disponible — cohérent avec le comportement actuel
 * (aucune régression pour les fiches de l'annuaire de démo ou les comptes qui
 * n'ont jamais touché à cette fonctionnalité).
 *
 * `isProviderAvailableOn` est consommé par `providerDirectory.searchProviders`
 * (server/utils/providerDirectory.ts), qui filtre par défaut sur la date du
 * jour — donc aussi par le moteur de matching de la demande (`requestStore.
 * computeMatches`, qui construit ses candidats via `searchProviders`) sans
 * duplication de la règle.
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

const periodsByProviderId = new Map<string, UnavailabilityPeriod[]>()

export type AddUnavailabilityResult =
  | { ok: true; period: UnavailabilityPeriod }
  | { ok: false; error: 'invalid_date' | 'invalid_range' }

/** Enregistre une période d'indisponibilité (#290). */
export function addUnavailabilityPeriod(providerId: string, startDate: string, endDate: string): AddUnavailabilityResult {
  if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(endDate)) return { ok: false, error: 'invalid_date' }
  if (endDate < startDate) return { ok: false, error: 'invalid_range' }

  const period: UnavailabilityPeriod = { id: randomUUID(), providerId, startDate, endDate, createdAt: Date.now() }
  const periods = periodsByProviderId.get(providerId) ?? []
  periods.push(period)
  periodsByProviderId.set(providerId, periods)
  return { ok: true, period }
}

/** Supprime une période (le prestataire redevient disponible sur ces dates). */
export function removeUnavailabilityPeriod(providerId: string, periodId: string): boolean {
  const periods = periodsByProviderId.get(providerId)
  if (!periods) return false
  const index = periods.findIndex((period) => period.id === periodId)
  if (index === -1) return false
  periods.splice(index, 1)
  return true
}

/** Périodes déclarées par ce prestataire, triées par date de début. */
export function listUnavailabilityPeriods(providerId: string): UnavailabilityPeriod[] {
  return [...(periodsByProviderId.get(providerId) ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Le prestataire apparaît-il dans les propositions pour cette date (#290,
 * critère d'acceptation) ? `true` par défaut (aucune période déclarée), ce
 * qui préserve le comportement existant pour tout prestataire n'utilisant
 * pas cette fonctionnalité.
 */
export function isProviderAvailableOn(providerId: string, date: string): boolean {
  const periods = periodsByProviderId.get(providerId)
  if (!periods?.length) return true
  return !periods.some((period) => date >= period.startDate && date <= period.endDate)
}
