import { prisma } from '~~/server/utils/prisma'
import { SECTORS } from '~~/app/data/sectors'
import type { ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Persistance en base des profils prestataires (#admin, correctif audit H3,
 * approche « écriture double »). Le store de référence du SITE reste
 * providerStore (en mémoire) — ces écritures sont un MIROIR best-effort, non
 * bloquant, appelé en fire-and-forget par providerStore.upsertProviderProfile :
 * elles ne changent rien au comportement public (recherche/profils inchangés)
 * mais alimentent la table DB `providerProfile` que lit le dashboard admin
 * (liste des prestataires, fiche compte, mises en relation).
 *
 * La table `Sector` (jusque-là vide, secteurs servis par app/data/sectors.ts)
 * est seedée à la volée pour satisfaire la clé étrangère `providerProfile.sectorId`.
 */

/** Upsert idempotent du secteur (par slug) depuis le catalogue statique ; renvoie son id, ou null si le slug est inconnu. */
async function ensureSectorId(slug: string | undefined): Promise<string | null> {
  if (!slug) return null
  const s = SECTORS.find((x) => x.slug === slug)
  if (!s) return null
  const row = await prisma.sector.upsert({
    where: { slug: s.slug },
    create: { slug: s.slug, name: s.name, emoji: s.emoji, color: s.color, ink: s.ink },
    update: {},
    select: { id: true },
  })
  return row.id
}

/**
 * Écrit (ou met à jour) le miroir DB d'un profil prestataire. Ne touche jamais
 * `verified`/`ratingAverage`/`reviewCount` en update (gérés ailleurs). Silencieux
 * si le secteur est inconnu (rien à persister sans FK valide).
 */
export async function persistProviderProfile(profile: ProviderProfile): Promise<void> {
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
    // Profil complet (approche A) — scalaires + listes sérialisées en JSON.
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

  await prisma.providerProfile.upsert({
    where: { userId: profile.userId },
    create: { userId: profile.userId, ...common },
    update: common,
  })
}

/** Efface la position GPS du miroir DB (miroir de providerStore.clearProviderPosition). */
export async function persistClearPosition(userId: string): Promise<void> {
  await prisma.providerProfile.updateMany({
    where: { userId },
    data: { latitude: null, longitude: null },
  })
}

/**
 * Lit le miroir DB d'un profil prestataire (utile côté admin quand le store en
 * mémoire a été vidé par un redémarrage). Renvoie les champs d'affichage.
 */
export async function getPersistedProviderProfile(userId: string): Promise<{
  displayName: string
  sector: string | null
  city: string | null
  photoUrl: string | null
  latitude: number | null
  longitude: number | null
} | null> {
  const row = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { displayName: true, city: true, photoUrl: true, latitude: true, longitude: true, sector: { select: { slug: true } } },
  })
  if (!row) return null
  return {
    displayName: row.displayName,
    sector: row.sector?.slug ?? null,
    city: row.city,
    photoUrl: row.photoUrl,
    latitude: row.latitude,
    longitude: row.longitude,
  }
}
