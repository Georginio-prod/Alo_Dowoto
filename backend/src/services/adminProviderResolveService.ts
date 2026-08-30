import { userRepository } from '../repositories/userRepository'
import { providerProfileService } from './providerProfileService'
import { getProviderById } from './providerDirectoryService'

/**
 * Résout l'identité d'un prestataire pour l'affichage admin (#admin, page Mises
 * en relation), porté iso depuis `server/utils/adminProviderResolve.ts`
 * (ADR-0017). Dans les vraies données, `providerId` référence un COMPTE
 * prestataire (User) enrichi de son profil (displayName, secteur, photo) ; repli
 * sur l'annuaire de démo pour les conversations d'exemple (`p01…`). Le double
 * store Nitro (mémoire + miroir DB) est unifié ici sur la source DB
 * (`providerProfileService`). `missing` si rien ne résout.
 */
export interface ResolvedProvider {
  id: string
  name: string
  contact: string | null
  sector: string | null
  city: string | null
  photoUrl: string | null
  latitude: number | null
  longitude: number | null
  isRealAccount: boolean
  missing?: boolean
}

export async function resolveProviderIdentity(providerId: string): Promise<ResolvedProvider> {
  const user = await userRepository.findById(providerId)
  const profile = await providerProfileService.getProviderProfile(providerId)
  const demo = user || profile ? null : await getProviderById(providerId)

  if (!user && !profile && !demo) {
    return {
      id: providerId,
      name: providerId,
      contact: null,
      sector: null,
      city: null,
      photoUrl: null,
      latitude: null,
      longitude: null,
      isRealAccount: false,
      missing: true,
    }
  }

  const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : ''

  return {
    id: providerId,
    name: profile?.displayName || userName || demo?.displayName || providerId,
    contact: user?.contact ?? null,
    sector: profile?.sector ?? demo?.sector ?? null,
    city: profile?.city ?? user?.location ?? demo?.city ?? null,
    photoUrl: profile?.photoUrl ?? demo?.photoUrl ?? null,
    latitude: profile?.latitude ?? user?.latitude ?? demo?.latitude ?? null,
    longitude: profile?.longitude ?? user?.longitude ?? demo?.longitude ?? null,
    isRealAccount: !!user,
  }
}
