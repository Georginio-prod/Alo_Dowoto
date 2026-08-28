import type { PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'
import { SECTORS } from '../data/sectors'
import type {
  CertificationEntry,
  FormationEntry,
  Mobility,
  PayoutMethod,
  ProviderProfile,
} from '../services/providerProfileService'

/**
 * Accès données du profil prestataire complet (`prisma.providerProfile`). Porté
 * iso depuis `server/utils/providerProfilePersist.ts` (ADR-0016) : mêmes colonnes,
 * même (dé)sérialisation JSON des listes, même seed de `Sector` (clé étrangère
 * `sectorId`). Client Prisma injecté.
 */
const FULL_SELECT = {
  userId: true,
  displayName: true,
  city: true,
  description: true,
  photoUrl: true,
  rateFrom: true,
  rateTo: true,
  latitude: true,
  longitude: true,
  quartier: true,
  adresse: true,
  pointsDeRepere: true,
  rayonInterventionKm: true,
  positionApproximative: true,
  payoutMethod: true,
  mobility: true,
  availability: true,
  cvUrl: true,
  cvFileName: true,
  whatsapp: true,
  website: true,
  languages: true,
  formations: true,
  certifications: true,
  updatedAt: true,
  sector: { select: { slug: true } },
} as const

function parseJson<T>(raw: string | null): T | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

type FullRow = {
  userId: string
  displayName: string
  city: string | null
  description: string | null
  photoUrl: string | null
  rateFrom: number | null
  rateTo: number | null
  latitude: number | null
  longitude: number | null
  quartier: string | null
  adresse: string | null
  pointsDeRepere: string | null
  rayonInterventionKm: number | null
  positionApproximative: boolean
  payoutMethod: string | null
  mobility: string | null
  availability: string | null
  cvUrl: string | null
  cvFileName: string | null
  whatsapp: string | null
  website: string | null
  languages: string | null
  formations: string | null
  certifications: string | null
  updatedAt: Date
  sector: { slug: string } | null
}

function rowToProfile(row: FullRow): ProviderProfile {
  return {
    userId: row.userId,
    displayName: row.displayName,
    sector: row.sector?.slug ?? '',
    city: row.city ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    quartier: row.quartier ?? undefined,
    adresse: row.adresse ?? undefined,
    pointsDeRepere: row.pointsDeRepere ?? undefined,
    rayonInterventionKm: row.rayonInterventionKm ?? undefined,
    positionApproximative: row.positionApproximative,
    payoutMethod: (row.payoutMethod as PayoutMethod | null) ?? undefined,
    photoUrl: row.photoUrl ?? undefined,
    description: row.description ?? undefined,
    rateFrom: row.rateFrom ?? undefined,
    rateTo: row.rateTo ?? undefined,
    mobility: (row.mobility as Mobility | null) ?? undefined,
    availability: row.availability ?? undefined,
    cvUrl: row.cvUrl ?? undefined,
    cvFileName: row.cvFileName ?? undefined,
    languages: parseJson<string[]>(row.languages),
    formations: parseJson<FormationEntry[]>(row.formations),
    certifications: parseJson<CertificationEntry[]>(row.certifications),
    whatsapp: row.whatsapp ?? undefined,
    website: row.website ?? undefined,
    updatedAt: row.updatedAt.getTime(),
  }
}

export interface ProviderProfileRepository {
  readFromDb(userId: string): Promise<ProviderProfile | null>
  listFromDb(): Promise<ProviderProfile[]>
  persist(profile: ProviderProfile): Promise<void>
  clearPosition(userId: string): Promise<void>
}

export function createProviderProfileRepository(db: PrismaClient): ProviderProfileRepository {
  /** Upsert idempotent du secteur (par slug) ; renvoie son id, ou null si inconnu. */
  async function ensureSectorId(slug: string | undefined): Promise<string | null> {
    if (!slug) return null
    const s = SECTORS.find((x) => x.slug === slug)
    if (!s) return null
    const row = await db.sector.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, name: s.name, emoji: s.emoji, color: s.color, ink: s.ink },
      update: {},
      select: { id: true },
    })
    return row.id
  }

  return {
    async readFromDb(userId) {
      const row = await db.providerProfile.findUnique({ where: { userId }, select: FULL_SELECT })
      return row ? rowToProfile(row) : null
    },
    async listFromDb() {
      const rows = await db.providerProfile.findMany({ select: FULL_SELECT })
      return rows.map(rowToProfile)
    },
    async persist(profile) {
      const sectorId = await ensureSectorId(profile.sector)
      if (!sectorId) return

      const common = {
        displayName: profile.displayName,
        sectorId,
        city: profile.city ?? null,
        description: profile.description ?? null,
        photoUrl: profile.photoUrl ?? null,
        rateFrom: profile.rateFrom ?? null,
        latitude: profile.latitude ?? null,
        longitude: profile.longitude ?? null,
        quartier: profile.quartier ?? null,
        adresse: profile.adresse ?? null,
        pointsDeRepere: profile.pointsDeRepere ?? null,
        rayonInterventionKm: profile.rayonInterventionKm ?? null,
        positionApproximative: profile.positionApproximative ?? true,
        payoutMethod: profile.payoutMethod ?? null,
        rateTo: profile.rateTo ?? null,
        mobility: profile.mobility ?? null,
        availability: profile.availability ?? null,
        cvUrl: profile.cvUrl ?? null,
        cvFileName: profile.cvFileName ?? null,
        whatsapp: profile.whatsapp ?? null,
        website: profile.website ?? null,
        languages: profile.languages ? JSON.stringify(profile.languages) : null,
        formations: profile.formations ? JSON.stringify(profile.formations) : null,
        certifications: profile.certifications ? JSON.stringify(profile.certifications) : null,
      }

      await db.providerProfile.upsert({
        where: { userId: profile.userId },
        create: { userId: profile.userId, ...common },
        update: common,
      })
    },
    async clearPosition(userId) {
      await db.providerProfile.updateMany({ where: { userId }, data: { latitude: null, longitude: null } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const providerProfileRepository = createProviderProfileRepository(prisma)
