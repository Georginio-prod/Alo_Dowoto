import type { PrealableQuestion, Sector, SiteContent, SubSector } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Catégories de service et contenu éditorial (#dashboard-admin, module 10),
 * portés iso depuis `server/utils/adminCategoryStore.ts` (ADR-0017) — CRUD réel
 * sur `Sector`/`SubSector`/`SiteContent`/`PrealableQuestion`. Le site public lit
 * encore la liste statique (`data/sectors.ts`) : rebrancher est un chantier
 * séparé. Lignes Prisma renvoyées telles quelles (dates → ISO en JSON, iso Nitro).
 */

export interface SectorInput {
  slug: string
  name: string
  emoji: string
  color: string
  ink: string
}

export function listSectors(): Promise<(Sector & { subSectors: SubSector[] })[]> {
  return prisma.sector.findMany({ orderBy: { order: 'asc' }, include: { subSectors: true } })
}

export async function createSector(input: SectorInput): Promise<Sector> {
  const max = await prisma.sector.aggregate({ _max: { order: true } })
  return prisma.sector.create({ data: { ...input, order: (max._max.order ?? 0) + 1 } })
}

export function renameSector(id: string, name: string): Promise<Sector> {
  return prisma.sector.update({ where: { id }, data: { name } })
}

export function setSectorActive(id: string, active: boolean): Promise<Sector> {
  return prisma.sector.update({ where: { id }, data: { active } })
}

export function reorderSector(id: string, order: number): Promise<Sector> {
  return prisma.sector.update({ where: { id }, data: { order } })
}

export function updateSectorIcon(id: string, emoji: string): Promise<Sector> {
  return prisma.sector.update({ where: { id }, data: { emoji } })
}

// --- Contenu des pages publiques ---

export function listSiteContent(): Promise<SiteContent[]> {
  return prisma.siteContent.findMany({ orderBy: { key: 'asc' } })
}

export function upsertSiteContent(key: string, label: string, value: string): Promise<SiteContent> {
  return prisma.siteContent.upsert({ where: { key }, create: { key, label, value }, update: { label, value } })
}

// --- Questions de fiche préalable par catégorie ---

export function listPrealableQuestions(sectorId: string): Promise<PrealableQuestion[]> {
  return prisma.prealableQuestion.findMany({ where: { sectorId }, orderBy: { order: 'asc' } })
}

export async function createPrealableQuestion(sectorId: string, label: string, required: boolean): Promise<PrealableQuestion> {
  const max = await prisma.prealableQuestion.aggregate({ where: { sectorId }, _max: { order: true } })
  return prisma.prealableQuestion.create({ data: { sectorId, label, required, order: (max._max.order ?? 0) + 1 } })
}

export async function deletePrealableQuestion(id: string): Promise<void> {
  await prisma.prealableQuestion.delete({ where: { id } })
}
