/**
 * Store en mémoire pour les profils prestataires. Suffisant pour ce lot
 * (pas de base de données encore en place, voir #45/#46).
 *
 * Seul `sector` est renseigné par le prototype actuel (#26). Les champs
 * photo/description/tarifs sont anticipés pour une itération future et
 * restent facultatifs.
 */

export interface ProviderProfile {
  userId: string
  sector: string
  photoUrl?: string
  description?: string
  rateFrom?: number
  updatedAt: number
}

export interface ProviderProfilePatch {
  sector: string
  photoUrl?: string
  description?: string
  rateFrom?: number
}

const profilesByUserId = new Map<string, ProviderProfile>()

export function upsertProviderProfile(userId: string, patch: ProviderProfilePatch): ProviderProfile {
  const existing = profilesByUserId.get(userId)
  const profile: ProviderProfile = {
    userId,
    sector: patch.sector,
    photoUrl: patch.photoUrl ?? existing?.photoUrl,
    description: patch.description ?? existing?.description,
    rateFrom: patch.rateFrom ?? existing?.rateFrom,
    updatedAt: Date.now(),
  }
  profilesByUserId.set(userId, profile)
  return profile
}

export function getProviderProfile(userId: string): ProviderProfile | null {
  return profilesByUserId.get(userId) ?? null
}
