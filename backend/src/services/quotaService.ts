import type { PlanSlug } from '../data/plans'
import { monthlyUsageRepository, type MonthlyUsageRepository } from '../repositories/monthlyUsageRepository'

/** Quota gratuit de contacts (mises en relation) par mois, côté client. */
export const CLIENT_CONTACTS_MONTHLY_LIMIT = 3

/** `null` représente une formule sans plafond de demandes reçues. */
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

const CONTACTS_SCOPE = 'contacts'
const REQUESTS_SCOPE = 'requests'

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function createQuotaService(repository: MonthlyUsageRepository = monthlyUsageRepository) {
  async function count(userId: string, scope: string): Promise<{ count: number; month: string }> {
    const month = currentMonthKey()
    return { count: await repository.get(userId, scope, month), month }
  }

  return {
    async getClientContactsUsage(userId: string): Promise<QuotaUsage> {
      return { ...(await count(userId, CONTACTS_SCOPE)), limit: CLIENT_CONTACTS_MONTHLY_LIMIT }
    },
    async incrementClientContacts(userId: string): Promise<{ count: number; month: string }> {
      const month = currentMonthKey()
      return { count: await repository.increment(userId, CONTACTS_SCOPE, month), month }
    },
    async getProviderRequestsUsage(userId: string, plan: PlanSlug | null | undefined): Promise<QuotaUsage> {
      return { ...(await count(userId, REQUESTS_SCOPE)), limit: plan ? PROVIDER_REQUESTS_MONTHLY_LIMIT[plan] : 0 }
    },
    async incrementProviderRequestsReceived(userId: string): Promise<{ count: number; month: string }> {
      const month = currentMonthKey()
      return { count: await repository.increment(userId, REQUESTS_SCOPE, month), month }
    },
  }
}

export const quotaService = createQuotaService()
export const getClientContactsUsage = quotaService.getClientContactsUsage
export const incrementClientContacts = quotaService.incrementClientContacts
export const getProviderRequestsUsage = quotaService.getProviderRequestsUsage
export const incrementProviderRequestsReceived = quotaService.incrementProviderRequestsReceived
