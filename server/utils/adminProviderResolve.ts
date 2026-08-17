import { getUserById } from '~~/server/utils/userStore'
import { getProviderProfile } from '~~/server/utils/providerStore'
import { getPersistedProviderProfile } from '~~/server/utils/providerProfilePersist'
import { getProviderById } from '~~/server/utils/providerDirectory'

/**
 * Résout l'identité d'un prestataire pour l'affichage admin (#admin, page Mises
 * en relation). Dans les vraies données, `providerId` référence un COMPTE
 * prestataire réel (User) — on l'enrichit avec son profil en mémoire
 * (providerStore : displayName, secteur, photo). Repli sur l'annuaire de démo
 * (providerDirectory) pour les conversations d'exemple dont le `providerId`
 * est un id d'annuaire (p01…). `missing` si rien ne résout.
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
  const user = await getUserById(providerId)
  // Profil : store en mémoire (frais) puis miroir DB (survit aux redémarrages,
  // audit H3 écriture double). Les deux exposent les mêmes champs d'affichage.
  const profile = getProviderProfile(providerId) ?? (await getPersistedProviderProfile(providerId))
  const demo = user || profile ? null : getProviderById(providerId)

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
