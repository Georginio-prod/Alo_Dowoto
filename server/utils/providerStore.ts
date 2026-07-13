/**
 * Store en mémoire pour les profils prestataires. Suffisant pour ce lot
 * (pas de base de données encore en place, voir #45/#46).
 *
 * `sector`, `city` et `payoutMethod` sont renseignés à l'inscription
 * prestataire (#26, #123). Les champs photo/description/tarifs sont
 * anticipés pour une itération future et restent facultatifs.
 */

export type PayoutMethod = 'flooz' | 'tmoney' | 'virement'

export interface ProviderProfile {
  userId: string
  sector: string
  city?: string
  payoutMethod?: PayoutMethod
  photoUrl?: string
  description?: string
  rateFrom?: number
  updatedAt: number
}

export interface ProviderProfilePatch {
  sector: string
  city?: string
  payoutMethod?: PayoutMethod
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
    city: patch.city ?? existing?.city,
    payoutMethod: patch.payoutMethod ?? existing?.payoutMethod,
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
