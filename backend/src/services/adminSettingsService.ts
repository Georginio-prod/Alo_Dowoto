import { prisma } from '../config/prisma'

/**
 * Réglages généraux de la plateforme (#dashboard-admin, modules 7 et 12), portés
 * iso depuis `server/utils/adminSettingsStore.ts` (ADR-0017) — ligne unique
 * `PlatformSettings` (id=1), créée à la demande avec ses valeurs par défaut. Lus
 * par le dashboard ; pas encore branchés sur les constantes codées en dur
 * ailleurs (ex. `ESCROW_COMMISSION_RATE`) — chantier séparé.
 */
export interface PlatformSettingsData {
  geoRadiusKm: number
  autoValidationDelayHours: number
  retractationDelayHours: number
  currency: string
  language: string
  minAdvanceAmount: number
  commissionRate: number
}

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  const row = await prisma.platformSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
  return {
    geoRadiusKm: row.geoRadiusKm,
    autoValidationDelayHours: row.autoValidationDelayHours,
    retractationDelayHours: row.retractationDelayHours,
    currency: row.currency,
    language: row.language,
    minAdvanceAmount: row.minAdvanceAmount,
    commissionRate: row.commissionRate,
  }
}

export async function updatePlatformSettings(patch: Partial<PlatformSettingsData>): Promise<PlatformSettingsData> {
  await prisma.platformSettings.upsert({ where: { id: 1 }, create: { id: 1, ...patch }, update: patch })
  return getPlatformSettings()
}
