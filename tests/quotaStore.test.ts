import { describe, expect, it } from 'vitest'
import {
  CLIENT_CONTACTS_MONTHLY_LIMIT,
  getClientContactsUsage,
  getProviderRequestsUsage,
  incrementClientContacts,
  incrementProviderRequestsReceived,
} from '~~/server/utils/quotaStore'

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

describe('quotaStore (#65 quotas)', () => {
  it('démarre à 0 contact pour un client jamais vu', () => {
    const usage = getClientContactsUsage('client-fresh-1')
    expect(usage).toEqual({ count: 0, limit: CLIENT_CONTACTS_MONTHLY_LIMIT, month: currentMonthKey() })
  })

  it('incrémente le compteur de contacts à chaque appel', () => {
    const userId = 'client-increment-1'
    expect(incrementClientContacts(userId)).toEqual({ count: 1, month: currentMonthKey() })
    expect(incrementClientContacts(userId)).toEqual({ count: 2, month: currentMonthKey() })
    expect(getClientContactsUsage(userId).count).toBe(2)
  })

  it('isole les compteurs de contacts par client', () => {
    incrementClientContacts('client-a')
    incrementClientContacts('client-a')
    incrementClientContacts('client-b')
    expect(getClientContactsUsage('client-a').count).toBe(2)
    expect(getClientContactsUsage('client-b').count).toBe(1)
  })

  it('incrémente le compteur de demandes reçues par prestataire', () => {
    const providerId = 'provider-increment-1'
    incrementProviderRequestsReceived(providerId)
    incrementProviderRequestsReceived(providerId)
    const usage = getProviderRequestsUsage(providerId, 'mensuel')
    expect(usage.count).toBe(2)
  })

  it('applique la limite du plan mensuel (Starter = 5)', () => {
    expect(getProviderRequestsUsage('provider-plan-mensuel', 'mensuel').limit).toBe(5)
  })

  it('applique la limite du plan trimestriel (Pro = 20)', () => {
    expect(getProviderRequestsUsage('provider-plan-trimestriel', 'trimestriel').limit).toBe(20)
  })

  it('ne limite pas le plan annuel (Premium = illimité)', () => {
    expect(getProviderRequestsUsage('provider-plan-annuel', 'annuel').limit).toBeNull()
  })

  it('considère un quota de 0 quand le prestataire n’a pas de plan actif', () => {
    expect(getProviderRequestsUsage('provider-sans-plan', null).limit).toBe(0)
    expect(getProviderRequestsUsage('provider-sans-plan-2', undefined).limit).toBe(0)
  })
})
