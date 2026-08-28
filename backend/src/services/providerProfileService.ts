import { providerProfileRepository, type ProviderProfileRepository } from '../repositories/providerProfileRepository'

/**
 * Profil prestataire (#124/#263/#356). Logique **portée iso** depuis
 * `server/utils/providerStore.ts` (ADR-0016) — mode `db` uniquement (la base est
 * la source de vérité côté backend). Les types et règles (fusion de patch,
 * champs d'onboarding obligatoires) sont reproduits à l'identique.
 */
export type PayoutMethod = 'flooz' | 'tmoney' | 'virement'
export type Mobility = 'client' | 'atelier' | 'les_deux'

export interface FormationEntry {
  title: string
  institution: string
  year: string
}

export interface CertificationEntry {
  id: string
  title: string
  fileUrl: string
  fileName: string
  status: 'en_attente' | 'verifiee'
}

export interface ProviderProfile {
  userId: string
  displayName: string
  sector: string
  city?: string
  latitude?: number
  longitude?: number
  quartier?: string
  adresse?: string
  pointsDeRepere?: string
  rayonInterventionKm?: number
  positionApproximative?: boolean
  payoutMethod?: PayoutMethod
  photoUrl?: string
  description?: string
  rateFrom?: number
  rateTo?: number
  mobility?: Mobility
  availability?: string
  cvUrl?: string
  cvFileName?: string
  languages?: string[]
  formations?: FormationEntry[]
  certifications?: CertificationEntry[]
  whatsapp?: string
  website?: string
  updatedAt: number
}

export interface ProviderProfilePatch {
  displayName: string
  sector: string
  city?: string
  latitude?: number
  longitude?: number
  quartier?: string
  adresse?: string
  pointsDeRepere?: string
  rayonInterventionKm?: number
  positionApproximative?: boolean
  payoutMethod?: PayoutMethod
  photoUrl?: string
  description?: string
  rateFrom?: number
  rateTo?: number
  mobility?: Mobility
  availability?: string
  /** `null` efface explicitement le CV enregistré ; `undefined` conserve la valeur existante. */
  cvUrl?: string | null
  cvFileName?: string | null
  languages?: string[]
  formations?: FormationEntry[]
  certifications?: CertificationEntry[]
  whatsapp?: string
  website?: string
}

export const PAYOUT_METHODS: PayoutMethod[] = ['flooz', 'tmoney', 'virement']
export const MOBILITY_OPTIONS: Mobility[] = ['client', 'atelier', 'les_deux']

export type RequiredOnboardingFields =
  | { ok: true; city: string; payoutMethod: PayoutMethod }
  | { ok: false; error: string }

/** `undefined` dans le patch conserve la valeur existante ; `null` l'efface explicitement. */
function withNullableOverride<T>(patchValue: T | null | undefined, existingValue: T | undefined): T | undefined {
  if (patchValue === undefined) return existingValue
  return patchValue ?? undefined
}

/**
 * Localisation et mode de rémunération obligatoires à l'inscription (#124).
 * Une mise à jour partielle retombe sur la valeur déjà enregistrée. Iso
 * `providerStore.resolveRequiredOnboardingFields`.
 */
export function resolveRequiredOnboardingFields(
  patch: { city?: string; payoutMethod?: PayoutMethod },
  existing: ProviderProfile | null,
): RequiredOnboardingFields {
  const city = patch.city?.trim() || existing?.city
  const payoutMethod = patch.payoutMethod ?? existing?.payoutMethod

  if (!city) return { ok: false, error: 'La localisation est obligatoire.' }
  if (!payoutMethod || !PAYOUT_METHODS.includes(payoutMethod)) {
    return { ok: false, error: 'Le mode de rémunération WorkTogo est obligatoire.' }
  }
  return { ok: true, city, payoutMethod }
}

export function createProviderProfileService(repo: ProviderProfileRepository = providerProfileRepository) {
  return {
    getProviderProfile(userId: string): Promise<ProviderProfile | null> {
      return repo.readFromDb(userId)
    },

    listProviderProfiles(): Promise<ProviderProfile[]> {
      return repo.listFromDb()
    },

    async upsertProviderProfile(userId: string, patch: ProviderProfilePatch): Promise<ProviderProfile> {
      const existing = await repo.readFromDb(userId)
      const profile: ProviderProfile = {
        userId,
        displayName: patch.displayName,
        sector: patch.sector,
        city: patch.city ?? existing?.city,
        latitude: patch.latitude ?? existing?.latitude,
        longitude: patch.longitude ?? existing?.longitude,
        quartier: patch.quartier ?? existing?.quartier,
        adresse: patch.adresse ?? existing?.adresse,
        pointsDeRepere: patch.pointsDeRepere ?? existing?.pointsDeRepere,
        rayonInterventionKm: patch.rayonInterventionKm ?? existing?.rayonInterventionKm,
        // `??` (pas `||`) : un `false` explicite (opt-out) doit être conservé.
        positionApproximative: patch.positionApproximative ?? existing?.positionApproximative ?? true,
        payoutMethod: patch.payoutMethod ?? existing?.payoutMethod,
        photoUrl: patch.photoUrl ?? existing?.photoUrl,
        description: patch.description ?? existing?.description,
        rateFrom: patch.rateFrom ?? existing?.rateFrom,
        rateTo: patch.rateTo ?? existing?.rateTo,
        mobility: patch.mobility ?? existing?.mobility,
        availability: patch.availability ?? existing?.availability,
        cvUrl: withNullableOverride(patch.cvUrl, existing?.cvUrl),
        cvFileName: withNullableOverride(patch.cvFileName, existing?.cvFileName),
        languages: patch.languages ?? existing?.languages,
        formations: patch.formations ?? existing?.formations,
        certifications: patch.certifications ?? existing?.certifications,
        whatsapp: patch.whatsapp ?? existing?.whatsapp,
        website: patch.website ?? existing?.website,
        updatedAt: Date.now(),
      }
      await repo.persist(profile)
      return profile
    },

    /** Supprime la position GPS précise (#geoloc). `quartier`/`city` conservés. Iso `providerStore.clearProviderPosition`. */
    async clearProviderPosition(userId: string): Promise<ProviderProfile | null> {
      const existing = await repo.readFromDb(userId)
      if (!existing) return null
      await repo.clearPosition(userId)
      return { ...existing, latitude: undefined, longitude: undefined, updatedAt: Date.now() }
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const providerProfileService = createProviderProfileService()
