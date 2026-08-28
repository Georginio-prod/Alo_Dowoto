import type { PlanSlug } from '../data/plans'

/**
 * Compteurs d'usage mensuels (#65) : contacts envoyés par un client, demandes
 * reçues par un prestataire. Porté **iso** depuis `server/utils/quotaStore.ts`
 * (ADR-0016), **volontairement en mémoire** comme Nitro — même comportement
 * observable (compteurs volatils, remis à zéro au redémarrage), donc « zéro
 * changement fonctionnel ». La persistance (survie aux redémarrages, #45/#46)
 * reste un chantier distinct, non couvert par ce port.
 *
 * Remise à zéro mensuelle sans cron : chaque compteur est indexé par
 * `${id}:${AAAA-MM}` (mois courant). Au changement de mois, la clé du mois
 * courant n'existe pas encore → lecture retombe naturellement sur 0. Les mois
 * précédents restent en mémoire (historique) sans impact sur le mois courant.
 */

/** Quota gratuit de contacts (mises en relation) par mois, côté client. */
export const CLIENT_CONTACTS_MONTHLY_LIMIT = 3

/**
 * Quota de demandes reçues par mois, selon la formule prestataire (#29).
 * `null` = illimité (formule Annuel/Premium).
 */
export const PROVIDER_REQUESTS_MONTHLY_LIMIT: Record<PlanSlug, number | null> = {
  mensuel: 5,
  trimestriel: 20,
  annuel: null,
}

export interface QuotaUsage {
  count: number
  limit: number | null
  month: string
}

const clientContactsByKey = new Map<string, number>()
const providerRequestsByKey = new Map<string, number>()

function currentMonthKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function usageKey(id: string, month: string): string {
  return `${id}:${month}`
}

/** Incrémente le compteur de contacts du mois courant pour ce client. */
export function incrementClientContacts(userId: string): { count: number; month: string } {
  const month = currentMonthKey()
  const key = usageKey(userId, month)
  const count = (clientContactsByKey.get(key) ?? 0) + 1
  clientContactsByKey.set(key, count)
  return { count, month }
}

/** Consulte l'usage courant de quota de contacts d'un client (sans l'incrémenter). */
export function getClientContactsUsage(userId: string): QuotaUsage {
  const month = currentMonthKey()
  const count = clientContactsByKey.get(usageKey(userId, month)) ?? 0
  return { count, limit: CLIENT_CONTACTS_MONTHLY_LIMIT, month }
}

/** Incrémente le compteur de demandes reçues du mois courant pour ce prestataire. */
export function incrementProviderRequestsReceived(providerId: string): { count: number; month: string } {
  const month = currentMonthKey()
  const key = usageKey(providerId, month)
  const count = (providerRequestsByKey.get(key) ?? 0) + 1
  providerRequestsByKey.set(key, count)
  return { count, month }
}

/**
 * Consulte l'usage courant de quota de demandes reçues d'un prestataire.
 * `plan` doit être `null`/`undefined` quand le prestataire n'a pas d'abonnement
 * actif : le quota est alors considéré comme nul (#63 — un prestataire sans
 * formule active n'est pas éligible à recevoir de nouvelles demandes).
 */
export function getProviderRequestsUsage(providerId: string, plan: PlanSlug | null | undefined): QuotaUsage {
  const month = currentMonthKey()
  const count = providerRequestsByKey.get(usageKey(providerId, month)) ?? 0
  const limit = plan ? PROVIDER_REQUESTS_MONTHLY_LIMIT[plan] : 0
  return { count, limit, month }
}
