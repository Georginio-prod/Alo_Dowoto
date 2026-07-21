import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  addUnavailabilityPeriod,
  isProviderAvailableOn,
  listUnavailabilityPeriods,
  removeUnavailabilityPeriod,
} from '~~/server/utils/providerAvailabilityStore'

function id(): string {
  return randomUUID()
}

describe('providerAvailabilityStore (#290 disponibilité en temps réel)', () => {
  it('un prestataire sans période déclarée est disponible à toute date', () => {
    expect(isProviderAvailableOn(id(), '2026-08-01')).toBe(true)
  })

  it('addUnavailabilityPeriod enregistre une période valide', () => {
    const providerId = id()
    const result = addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.period.startDate).toBe('2026-08-01')
      expect(result.period.endDate).toBe('2026-08-05')
    }
  })

  it('refuse un format de date invalide', () => {
    expect(addUnavailabilityPeriod(id(), '01/08/2026', '2026-08-05')).toEqual({ ok: false, error: 'invalid_date' })
  })

  it('refuse une date de fin antérieure à la date de début', () => {
    expect(addUnavailabilityPeriod(id(), '2026-08-05', '2026-08-01')).toEqual({ ok: false, error: 'invalid_range' })
  })

  it('accepte une période d’un seul jour (début = fin)', () => {
    const result = addUnavailabilityPeriod(id(), '2026-08-05', '2026-08-05')
    expect(result.ok).toBe(true)
  })

  it('isProviderAvailableOn renvoie false pour une date couverte par une période (bornes incluses)', () => {
    const providerId = id()
    addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')

    expect(isProviderAvailableOn(providerId, '2026-07-31')).toBe(true)
    expect(isProviderAvailableOn(providerId, '2026-08-01')).toBe(false)
    expect(isProviderAvailableOn(providerId, '2026-08-03')).toBe(false)
    expect(isProviderAvailableOn(providerId, '2026-08-05')).toBe(false)
    expect(isProviderAvailableOn(providerId, '2026-08-06')).toBe(true)
  })

  it('listUnavailabilityPeriods trie par date de début et isole les prestataires entre eux', () => {
    const providerId = id()
    addUnavailabilityPeriod(providerId, '2026-09-01', '2026-09-05')
    addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')
    addUnavailabilityPeriod(id(), '2026-01-01', '2026-01-02')

    const periods = listUnavailabilityPeriods(providerId)
    expect(periods.map((period) => period.startDate)).toEqual(['2026-08-01', '2026-09-01'])
  })

  it('removeUnavailabilityPeriod supprime une période, le prestataire redevient disponible', () => {
    const providerId = id()
    const result = addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')
    if (!result.ok) throw new Error('setup failed')

    const removed = removeUnavailabilityPeriod(providerId, result.period.id)

    expect(removed).toBe(true)
    expect(isProviderAvailableOn(providerId, '2026-08-03')).toBe(true)
  })

  it('removeUnavailabilityPeriod renvoie false pour un id inconnu ou un prestataire sans période (cas limite)', () => {
    expect(removeUnavailabilityPeriod(id(), 'id-inexistant')).toBe(false)
  })
})
