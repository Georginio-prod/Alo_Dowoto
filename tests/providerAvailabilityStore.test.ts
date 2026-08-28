import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '~~/server/utils/prisma'
import {
  addUnavailabilityPeriod,
  isProviderAvailableOn,
  listUnavailabilityPeriods,
  removeUnavailabilityPeriod,
} from '~~/server/utils/providerAvailabilityStore'

/**
 * providerAvailabilityStore est désormais **persisté en base** (Prisma) : ses
 * lectures sont `async`. Le test nettoie les périodes qu'il crée (base partagée) —
 * `id()` collecte les providerIds pour la purge.
 */
const createdProviderIds: string[] = []

function id(): string {
  const value = randomUUID()
  createdProviderIds.push(value)
  return value
}

describe('providerAvailabilityStore (#290 disponibilité en temps réel)', () => {
  afterAll(async () => {
    await prisma.unavailabilityPeriod.deleteMany({ where: { providerId: { in: createdProviderIds } } }).catch(() => undefined)
  })

  it('un prestataire sans période déclarée est disponible à toute date', async () => {
    expect(await isProviderAvailableOn(id(), '2026-08-01')).toBe(true)
  })

  it('addUnavailabilityPeriod enregistre une période valide', async () => {
    const providerId = id()
    const result = await addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.period.startDate).toBe('2026-08-01')
      expect(result.period.endDate).toBe('2026-08-05')
    }
  })

  it('refuse un format de date invalide', async () => {
    expect(await addUnavailabilityPeriod(id(), '01/08/2026', '2026-08-05')).toEqual({ ok: false, error: 'invalid_date' })
  })

  it('refuse une date de fin antérieure à la date de début', async () => {
    expect(await addUnavailabilityPeriod(id(), '2026-08-05', '2026-08-01')).toEqual({ ok: false, error: 'invalid_range' })
  })

  it('accepte une période d’un seul jour (début = fin)', async () => {
    const result = await addUnavailabilityPeriod(id(), '2026-08-05', '2026-08-05')
    expect(result.ok).toBe(true)
  })

  it('isProviderAvailableOn renvoie false pour une date couverte par une période (bornes incluses)', async () => {
    const providerId = id()
    await addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')

    expect(await isProviderAvailableOn(providerId, '2026-07-31')).toBe(true)
    expect(await isProviderAvailableOn(providerId, '2026-08-01')).toBe(false)
    expect(await isProviderAvailableOn(providerId, '2026-08-03')).toBe(false)
    expect(await isProviderAvailableOn(providerId, '2026-08-05')).toBe(false)
    expect(await isProviderAvailableOn(providerId, '2026-08-06')).toBe(true)
  })

  it('listUnavailabilityPeriods trie par date de début et isole les prestataires entre eux', async () => {
    const providerId = id()
    await addUnavailabilityPeriod(providerId, '2026-09-01', '2026-09-05')
    await addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')
    await addUnavailabilityPeriod(id(), '2026-01-01', '2026-01-02')

    const periods = await listUnavailabilityPeriods(providerId)
    expect(periods.map((period) => period.startDate)).toEqual(['2026-08-01', '2026-09-01'])
  })

  it('removeUnavailabilityPeriod supprime une période, le prestataire redevient disponible', async () => {
    const providerId = id()
    const result = await addUnavailabilityPeriod(providerId, '2026-08-01', '2026-08-05')
    if (!result.ok) throw new Error('setup failed')

    const removed = await removeUnavailabilityPeriod(providerId, result.period.id)

    expect(removed).toBe(true)
    expect(await isProviderAvailableOn(providerId, '2026-08-03')).toBe(true)
  })

  it('removeUnavailabilityPeriod renvoie false pour un id inconnu ou un prestataire sans période (cas limite)', async () => {
    expect(await removeUnavailabilityPeriod(id(), 'id-inexistant')).toBe(false)
  })
})
