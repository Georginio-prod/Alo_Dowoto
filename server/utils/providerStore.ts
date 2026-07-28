/**
 * Store en mémoire pour les profils prestataires. Suffisant pour ce lot
 * (pas de base de données encore en place, voir #45/#46).
 *
 * `sector`, `city` et `payoutMethod` sont renseignés à l'inscription
 * prestataire (#26, #123). Les champs photo/description/tarifs sont
 * anticipés pour une itération future et restent facultatifs.
 *
 * CV, langues, formations, certifications, préférences et coordonnées
 * complémentaires (#hub-profil-prestataire) suivent le même principe : tous
 * facultatifs, remplis progressivement depuis le hub `/profil`.
 */

export type PayoutMethod = 'flooz' | 'tmoney' | 'virement'

/** Où le prestataire réalise ses prestations — affiché sur la carte « Préférences ». */
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
  /** Toujours `en_attente` à l'ajout : pas de flux de vérification admin dans ce lot. */
  status: 'en_attente' | 'verifiee'
}

export interface ProviderProfile {
  userId: string
  /** Recalculé à chaque enregistrement depuis l'identité de l'utilisateur (voir providers/me.patch.ts) — jamais fourni par le client. */
  displayName: string
  sector: string
  city?: string
  /** Coordonnées réelles de la zone d'intervention (#263), facultatives — repli sur `city` si absentes. */
  latitude?: number
  longitude?: number
  /** Slug d'un quartier de app/data/regions.ts (#geoloc) — complète `city` pour les zones où celle-ci ne suffit pas à situer précisément (ex. « Lomé » couvre plusieurs dizaines de quartiers). */
  quartier?: string
  /** Texte libre, jamais une adresse postale fiable au Togo (voir app/data/regions.ts) — renseigné à titre indicatif si le prestataire en a une. */
  adresse?: string
  /** Repère local en texte libre (« près du grand marché », « vers le carrefour Agoè ») affiché sur le profil en complément de la carte — la méthode la plus fiable localement quand l'adressage classique fait défaut. */
  pointsDeRepere?: string
  /** Distance maximale (km) que le prestataire accepte de parcourir pour intervenir chez le client — distinct de `mobility`, qui indique lui *si* il se déplace. */
  rayonInterventionKm?: number
  /**
   * `true` (défaut) : seul le quartier/une position floutée (`geo.fuzzCoordinate`)
   * est exposé publiquement, jamais les coordonnées exactes — vie privée par
   * défaut. `false` : le prestataire a explicitement choisi d'afficher sa
   * position précise (ex. commerce avec pignon sur rue).
   */
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
  /** `null` efface explicitement le CV déjà enregistré (bouton « Retirer », cv.vue) ; `undefined` laisse la valeur existante inchangée. */
  cvUrl?: string | null
  cvFileName?: string | null
  languages?: string[]
  formations?: FormationEntry[]
  certifications?: CertificationEntry[]
  whatsapp?: string
  website?: string
}

/** `undefined` dans le patch conserve la valeur existante ; `null` l'efface explicitement (voir `cvUrl` ci-dessus). */
function withNullableOverride<T>(patchValue: T | null | undefined, existingValue: T | undefined): T | undefined {
  if (patchValue === undefined) return existingValue
  return patchValue ?? undefined
}

const profilesByUserId = new Map<string, ProviderProfile>()

export function upsertProviderProfile(userId: string, patch: ProviderProfilePatch): ProviderProfile {
  const existing = profilesByUserId.get(userId)
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
    // `??` (pas `||`) : un `false` explicite dans `patch` (opt-out de la
    // position approximative) doit être conservé, pas retomber sur `existing`.
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
  profilesByUserId.set(userId, profile)
  return profile
}

export function getProviderProfile(userId: string): ProviderProfile | null {
  return profilesByUserId.get(userId) ?? null
}

/**
 * Tous les profils prestataires enregistrés (comptes réels), pour les
 * fusionner avec l'annuaire de démonstration côté recherche publique — voir
 * server/utils/providerDirectory.ts.
 */
export function listProviderProfiles(): ProviderProfile[] {
  return [...profilesByUserId.values()]
}

export const PAYOUT_METHODS: PayoutMethod[] = ['flooz', 'tmoney', 'virement']

export const MOBILITY_OPTIONS: Mobility[] = ['client', 'atelier', 'les_deux']

export type RequiredOnboardingFields =
  | { ok: true; city: string; payoutMethod: PayoutMethod }
  | { ok: false; error: string }

/**
 * Localisation et mode de rémunération sont obligatoires à l'inscription
 * prestataire (#124), contrôlés ici pour être réutilisés à la fois par
 * providers/me.patch.ts (défense en profondeur côté serveur) et par les
 * tests, indépendamment du transport HTTP. Une mise à jour partielle qui ne
 * renvoie pas ces champs retombe sur la valeur déjà enregistrée (ex.
 * complétion de profil après l'inscription).
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

/**
 * Supprime la position GPS précise enregistrée d'un prestataire (#geoloc,
 * partie 3 — vie privée). Action distincte de `upsertProviderProfile` : ce
 * dernier ne peut pas effacer `latitude`/`longitude` (un patch sans ces
 * champs conserve la valeur existante, par conception — voir sa
 * documentation), donc « supprimer ma position » a besoin de son propre
 * geste explicite, comme `userStore.clearUserPosition`. `quartier` et
 * `city` ne sont volontairement pas effacés : ce ne sont pas des
 * coordonnées précises.
 */
export function clearProviderPosition(userId: string): ProviderProfile | null {
  const existing = profilesByUserId.get(userId)
  if (!existing) return null
  const updated: ProviderProfile = { ...existing, latitude: undefined, longitude: undefined, updatedAt: Date.now() }
  profilesByUserId.set(userId, updated)
  return updated
}
