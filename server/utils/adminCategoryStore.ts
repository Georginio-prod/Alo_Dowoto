import { prisma } from '~~/server/utils/prisma'

/**
 * Catégories de service et contenu éditorial (#dashboard-admin, module 10) —
 * CRUD réel sur Sector/SubSector/SiteContent/PrealableQuestion (Prisma).
 * Le site public (recherche, /categories, inscription prestataire) lit
 * encore app/data/sectors.ts (liste statique) — voir la note du modèle
 * Sector dans prisma/schema.prisma et docs/admin-dashboard.md.
 */

export interface SectorInput {
  slug: string
  name: string
  emoji: string
  color: string
  ink: string
}

export async function listSectors() {
  return prisma.sector.findMany({ orderBy: { order: 'asc' }, include: { subSectors: true } })
}

export async function createSector(input: SectorInput) {
  const max = await prisma.sector.aggregate({ _max: { order: true } })
  return prisma.sector.create({ data: { ...input, order: (max._max.order ?? 0) + 1 } })
}

export async function renameSector(id: string, name: string) {
  return prisma.sector.update({ where: { id }, data: { name } })
}

export async function setSectorActive(id: string, active: boolean) {
  return prisma.sector.update({ where: { id }, data: { active } })
}

export async function reorderSector(id: string, order: number) {
  return prisma.sector.update({ where: { id }, data: { order } })
}

export async function updateSectorIcon(id: string, emoji: string) {
  return prisma.sector.update({ where: { id }, data: { emoji } })
}

// --- Contenu des pages publiques ---

export async function listSiteContent() {
  return prisma.siteContent.findMany({ orderBy: { key: 'asc' } })
}

export async function upsertSiteContent(key: string, label: string, value: string) {
  return prisma.siteContent.upsert({ where: { key }, create: { key, label, value }, update: { label, value } })
}

// --- Questions de fiche préalable par catégorie ---

export async function listPrealableQuestions(sectorId: string) {
  return prisma.prealableQuestion.findMany({ where: { sectorId }, orderBy: { order: 'asc' } })
}

export async function createPrealableQuestion(sectorId: string, label: string, required: boolean) {
  const max = await prisma.prealableQuestion.aggregate({ where: { sectorId }, _max: { order: true } })
  return prisma.prealableQuestion.create({ data: { sectorId, label, required, order: (max._max.order ?? 0) + 1 } })
}

export async function deletePrealableQuestion(id: string) {
  await prisma.prealableQuestion.delete({ where: { id } })
}
