import { SECTORS } from '../data/sectors'
import { DEFAULT_RADIUS_KM, RADIUS_SLIDER_OPTIONS_KM } from '../data/searchRadius'
import { isValidCoordinatePair } from '../validation/primitives'
import { boundingBoxAround, fuzzCoordinate, haversineDistanceKm, isWithinBoundingBox } from '../utils/geo'
import { scoreFeaturedProvider, type FeaturedCandidate } from './matchingEngine'
import { providerProfileService, type ProviderProfile } from './providerProfileService'
import { verificationService } from './verificationService'
import { reviewService } from './reviewService'
import { availabilityService, todayIsoDate } from './availabilityService'

/**
 * Annuaire des prestataires consultable par la recherche publique (#43), porté
 * iso depuis `server/utils/providerDirectory.ts` (ADR-0016). Fusionne un jeu de
 * démonstration en mémoire (fiches `p01…p14` de la maquette, incluses hors
 * production) avec les vrais comptes prestataires (profils DB), applique les
 * filtres, la disponibilité (#290), la distance (#263) et le tri multi-critères
 * (#288). Compose les services déjà portés (profils, vérification, avis,
 * disponibilité) — aucune duplication d'accès Prisma ici.
 */

export interface ProviderSearchResult {
  id: string
  displayName: string
  sector: string
  subSector: string
  city: string
  verified: boolean
  rating: number
  reviewCount: number
  priceFrom: number
  photoUrl: string | null
  /** Coordonnées de la zone d'intervention (#263), déjà floutées si position approximative ; `null` si non renseignées. */
  latitude: number | null
  longitude: number | null
  quartier: string | null
  /** Distance km depuis le chercheur, calculée quand coordonnées des deux côtés ; sinon `null`. */
  distanceKm: number | null
}

export interface ProviderSearchFilters {
  sector?: string
  subSectors?: string[]
  city?: string
  quartier?: string
  ratingMin?: number
  priceMax?: number
  query?: string
  /** Date ISO pour la disponibilité (#290) ; par défaut aujourd'hui. */
  date?: string
  /** Coordonnées du chercheur (#263) : activent distance, tri par proximité, filtrage par rayon. */
  latitude?: number
  longitude?: number
  radiusKm?: number
  /** Tri explicite de la barre de résultats — prime sur l'ordre par défaut. */
  sort?: ProviderSortOption
}

export type ProviderSortOption = 'note' | 'prix_asc' | 'prix_desc'

const DIRECTORY: ProviderSearchResult[] = [
  { id: 'p01', displayName: 'Akofa M.', sector: 'menage', subSector: 'Ménage à domicile', city: 'Lomé', verified: true, rating: 4.8, reviewCount: 32, priceFrom: 3000, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p02', displayName: 'Kossi A.', sector: 'menage', subSector: 'Ménage à domicile', city: 'Lomé', verified: true, rating: 4.6, reviewCount: 18, priceFrom: 2500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p03', displayName: 'Essolakina T.', sector: 'menage', subSector: 'Repassage', city: 'Lomé', verified: true, rating: 4.9, reviewCount: 54, priceFrom: 1500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p04', displayName: 'Yawa D.', sector: 'menage', subSector: 'Jardinage', city: 'Kara', verified: false, rating: 4.3, reviewCount: 9, priceFrom: 4000, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p05', displayName: 'Komi S.', sector: 'menage', subSector: "Garde d'enfants", city: 'Lomé', verified: true, rating: 4.7, reviewCount: 27, priceFrom: 3500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p06', displayName: 'Adjoa K.', sector: 'menage', subSector: 'Cuisine à domicile', city: 'Lomé', verified: false, rating: 4.5, reviewCount: 12, priceFrom: 5000, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p07', displayName: 'Mawuli N.', sector: 'menage', subSector: 'Ménage à domicile', city: 'Sokodé', verified: false, rating: 4.2, reviewCount: 6, priceFrom: 2000, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p08', displayName: 'Ablavi F.', sector: 'menage', subSector: 'Repassage', city: 'Kpalimé', verified: true, rating: 4.8, reviewCount: 21, priceFrom: 1800, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p09', displayName: 'Kokou B.', sector: 'btp', subSector: 'Plomberie', city: 'Lomé', verified: true, rating: 4.4, reviewCount: 15, priceFrom: 4500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p10', displayName: 'Sena A.', sector: 'digital', subSector: 'Développement web & mobile', city: 'Lomé', verified: true, rating: 4.9, reviewCount: 40, priceFrom: 6000, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p11', displayName: 'Afi D.', sector: 'beaute', subSector: 'Coiffure', city: 'Kara', verified: false, rating: 4.1, reviewCount: 5, priceFrom: 1500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p12', displayName: 'Yao T.', sector: 'evenement', subSector: 'Traiteur', city: 'Atakpamé', verified: true, rating: 4.6, reviewCount: 22, priceFrom: 5500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p13', displayName: 'Edem K.', sector: 'transport', subSector: 'Déménagement', city: 'Dapaong', verified: false, rating: 3.9, reviewCount: 3, priceFrom: 3500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
  { id: 'p14', displayName: 'Nadia P.', sector: 'menage', subSector: "Garde d'enfants", city: 'Kpalimé', verified: false, rating: 3.6, reviewCount: 4, priceFrom: 2500, photoUrl: null, latitude: null, longitude: null, quartier: null, distanceKm: null },
]

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Approximation du nombre d'années d'expérience à partir du nombre d'avis. */
export function estimateExperienceYears(reviewCount: number): number {
  return Math.max(1, Math.round(reviewCount / 8))
}

/**
 * Inclure l'annuaire de DÉMONSTRATION (faux prestataires `p01…`) dans les
 * résultats publics ? Utile pour peupler le catalogue en dev/démo, mais JAMAIS
 * en production (faux profils contactables/payables). Défaut : activé hors prod,
 * surchargeable via NUXT_PROVIDERS_DEMO=on|off. Iso Nitro.
 */
const INCLUDE_DEMO_PROVIDERS = process.env.NUXT_PROVIDERS_DEMO
  ? process.env.NUXT_PROVIDERS_DEMO === 'on'
  : process.env.NODE_ENV !== 'production'

/** Convertit un vrai profil prestataire au format annuaire (position floutée par défaut, #geoloc). */
async function toSearchResult(profile: ProviderProfile): Promise<ProviderSearchResult> {
  const sectorName = SECTORS.find((sector) => sector.slug === profile.sector)?.name ?? profile.sector

  const exposeExactPosition = profile.positionApproximative === false
  const coords = isValidCoordinatePair(profile.latitude, profile.longitude)
    ? { latitude: profile.latitude as number, longitude: profile.longitude as number }
    : null
  const publicCoords = coords && !exposeExactPosition ? fuzzCoordinate(coords) : coords

  return {
    id: profile.userId,
    displayName: profile.displayName,
    sector: profile.sector,
    subSector: sectorName,
    city: profile.city ?? '',
    verified: await verificationService.isVerified(profile.userId),
    rating: 0,
    reviewCount: 0,
    priceFrom: profile.rateFrom ?? 0,
    photoUrl: profile.photoUrl ?? null,
    latitude: publicCoords?.latitude ?? null,
    longitude: publicCoords?.longitude ?? null,
    quartier: profile.quartier ?? null,
    distanceKm: null,
  }
}

/** Annuaire de démonstration + vrais comptes prestataires, fusionnés. */
async function allProviders(): Promise<ProviderSearchResult[]> {
  const real = await Promise.all((await providerProfileService.listProviderProfiles()).map(toSearchResult))
  return INCLUDE_DEMO_PROVIDERS ? [...DIRECTORY, ...real] : real
}

/**
 * Note/nombre d'avis « effectifs » (#61) : dès qu'un avis existe, la moyenne
 * recalculée prévaut sur la note figée de l'annuaire ; sinon repli sur le
 * `fallback` fourni par l'appelant (évite de reconstruire l'annuaire). Iso.
 */
export async function getEffectiveRating(
  providerId: string,
  fallback?: { rating: number; reviewCount: number },
): Promise<{ rating: number; reviewCount: number }> {
  const { average, count } = await reviewService.getAverageRating(providerId)
  if (count > 0) return { rating: average, reviewCount: count }
  return { rating: fallback?.rating ?? 0, reviewCount: fallback?.reviewCount ?? 0 }
}

/** Score multi-critères (0-100) d'un résultat de recherche (tri par défaut). */
async function scoreSearchResult(provider: ProviderSearchResult): Promise<number> {
  const { rating, reviewCount } = await getEffectiveRating(provider.id, { rating: provider.rating, reviewCount: provider.reviewCount })
  return scoreFeaturedProvider({
    providerId: provider.id,
    rating,
    reviewCount,
    verified: provider.verified,
    experienceYears: estimateExperienceYears(reviewCount),
  }).total
}

/** Applique un tri explicite (copie le tableau, ne mute pas l'entrée). Iso Nitro. */
function sortResults(results: ProviderSearchResult[], sort: ProviderSortOption): ProviderSearchResult[] {
  const sorted = [...results]
  switch (sort) {
    case 'note':
      return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    case 'prix_asc':
      return sorted.sort((a, b) => a.priceFrom - b.priceFrom)
    case 'prix_desc':
      return sorted.sort((a, b) => b.priceFrom - a.priceFrom)
  }
}

/**
 * Recherche filtrée de prestataires (#43/#263/#288/#290). Porté iso : filtres
 * synchrones + pré-filtrage par boîte englobante, filtre de disponibilité (async
 * en lot), distance Haversine, puis tri (explicite > proximité > score).
 */
export async function searchProviders(filters: ProviderSearchFilters): Promise<ProviderSearchResult[]> {
  const query = filters.query ? normalize(filters.query) : ''
  const availabilityDate = filters.date ?? todayIsoDate()
  const searcherCoords = isValidCoordinatePair(filters.latitude, filters.longitude)
    ? { latitude: filters.latitude as number, longitude: filters.longitude as number }
    : null

  const radiusBoundingBox = searcherCoords && filters.radiusKm !== undefined
    ? boundingBoxAround(searcherCoords, filters.radiusKm)
    : null

  const preFiltered = (await allProviders()).filter((provider) => {
    if (filters.sector && provider.sector !== filters.sector) return false
    if (filters.subSectors?.length && !filters.subSectors.includes(provider.subSector)) return false
    if (filters.city && provider.city !== filters.city) return false
    if (filters.quartier && provider.quartier !== filters.quartier) return false
    if (filters.ratingMin !== undefined && provider.rating < filters.ratingMin) return false
    if (filters.priceMax !== undefined && provider.priceFrom > filters.priceMax) return false
    if (query) {
      const haystack = normalize(`${provider.displayName} ${provider.subSector} ${provider.city}`)
      if (!haystack.includes(query)) return false
    }
    if (radiusBoundingBox && provider.latitude !== null && provider.longitude !== null) {
      if (!isWithinBoundingBox({ latitude: provider.latitude, longitude: provider.longitude }, radiusBoundingBox)) return false
    }
    return true
  })

  const availabilityFlags = await Promise.all(
    preFiltered.map((provider) => availabilityService.isProviderAvailableOn(provider.id, availabilityDate)),
  )
  const filtered = preFiltered
    .filter((_provider, index) => availabilityFlags[index])
    .map((provider): ProviderSearchResult => {
      if (!searcherCoords || provider.latitude === null || provider.longitude === null) return provider
      const distanceKm = haversineDistanceKm(searcherCoords, { latitude: provider.latitude, longitude: provider.longitude })
      return { ...provider, distanceKm }
    })

  if (filters.sort) {
    return sortResults(filtered, filters.sort)
  }

  if (searcherCoords) {
    const radiusKm = filters.radiusKm
    const withinRadius = radiusKm !== undefined
      ? filtered.filter((provider) => provider.distanceKm === null || provider.distanceKm <= radiusKm)
      : filtered

    return withinRadius.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0
      if (a.distanceKm === null) return 1
      if (b.distanceKm === null) return -1
      return a.distanceKm - b.distanceKm
    })
  }

  const scored = await Promise.all(
    filtered.map(async (provider) => ({ provider, score: await scoreSearchResult(provider) })),
  )
  return scored
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.provider)
}

/** Retrouve une fiche par id, dans l'annuaire de démo ou parmi les vrais comptes. Iso Nitro. */
export async function getProviderById(id: string): Promise<ProviderSearchResult | null> {
  return (await allProviders()).find((provider) => provider.id === id) ?? null
}

/**
 * Tarif fixe d'un prestataire pour le paiement bloquant en séquestre (#194) :
 * priorité à la fiche de démo (`p01…p14`), puis au tarif renseigné par un vrai
 * compte prestataire. `null` si aucun tarif n'est disponible — vérifie
 * directement le profil (dont `rateFrom` peut être absent) plutôt que la fiche
 * fusionnée de `getProviderById`, qui retombe sur `0` et masquerait ce cas.
 * Iso `providerDirectory.resolveProviderRate`.
 */
export async function resolveProviderRate(providerId: string): Promise<number | null> {
  const directoryEntry = DIRECTORY.find((provider) => provider.id === providerId)
  if (directoryEntry) return directoryEntry.priceFrom
  return (await providerProfileService.getProviderProfile(providerId))?.rateFrom ?? null
}

/**
 * Nombre de prestataires de l'annuaire pour un secteur (#66, grille `/categories`).
 * Repose sur `searchProviders` pour rester cohérent avec la recherche publique.
 */
export async function countBySector(sector: string): Promise<number> {
  return (await searchProviders({ sector })).length
}

/**
 * Candidats prêts à être classés par `rankFeaturedProviders` (#187) : reprend la
 * note effective (#61) et approxime l'ancienneté. `sector` restreint la mise en
 * avant à ce secteur. Iso Nitro.
 */
export async function getFeaturedCandidates(sector?: string): Promise<FeaturedCandidate[]> {
  const providers = await searchProviders(sector ? { sector } : {})
  return Promise.all(providers.map(async (provider) => {
    const { rating, reviewCount } = await getEffectiveRating(provider.id, { rating: provider.rating, reviewCount: provider.reviewCount })
    return {
      providerId: provider.id,
      rating,
      reviewCount,
      verified: provider.verified,
      experienceYears: estimateExperienceYears(reviewCount),
    }
  }))
}

/** Fiche prestataire enrichie du score de mise en avant (#187, accueil chercheur). */
export interface FeaturedProviderResult extends ProviderSearchResult {
  featuredScore: number
  badge: 'top' | 'recommande'
}

export interface NearbySearchResult {
  results: ProviderSearchResult[]
  requestedRadiusKm: number
  usedRadiusKm: number
  widened: boolean
}

/**
 * Recherche de proximité avec élargissement automatique (#geoloc, 1.3) :
 * réessaie aux paliers de `RADIUS_SLIDER_OPTIONS_KM` strictement supérieurs
 * jusqu'au premier renvoyant au moins un résultat. `widened` prévient l'appelant
 * que le rayon a été élargi. Iso Nitro.
 */
export async function searchProvidersNearby(
  filters: Omit<ProviderSearchFilters, 'radiusKm'>,
  requestedRadiusKm: number = DEFAULT_RADIUS_KM,
): Promise<NearbySearchResult> {
  const widerSteps = RADIUS_SLIDER_OPTIONS_KM.filter((step) => step > requestedRadiusKm)

  let usedRadiusKm = requestedRadiusKm
  let results = await searchProviders({ ...filters, radiusKm: usedRadiusKm })

  for (const radiusKm of widerSteps) {
    if (results.length > 0) break
    results = await searchProviders({ ...filters, radiusKm })
    usedRadiusKm = radiusKm
  }

  return { results, requestedRadiusKm, usedRadiusKm, widened: usedRadiusKm !== requestedRadiusKm }
}

export interface ProviderDetail extends ProviderSearchResult {
  experienceYears: number
  bio: string
  availability: string
  cvUrl: string | null
  badges: { identity: boolean; skills: boolean }
  phone: string
  email: string
  /** Coordonnées démasquées ou non (#127) — voir `getProviderDetail`. */
  contactRevealed: boolean
}

/** Coordonnées de démonstration dérivées de façon stable à partir de l'id (annuaire de démo). */
function derivedContact(provider: ProviderSearchResult): { phone: string; email: string } {
  const digits = provider.id.replace(/\D/g, '').padStart(8, '7').slice(-8)
  const phone = `+228 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`
  const emailUser = normalize(provider.displayName).replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, '')
  return { phone, email: `${emailUser}@worktogo-demo.tg` }
}

function maskPhone(phone: string): string {
  const groups = phone.split(' ')
  return groups.map((group, i) => (i === 0 || i === groups.length - 1 ? group : '••')).join(' ')
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  const user = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)
  const visible = user.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(user.length - visible.length, 3))}@${domain}`
}

/**
 * Fiche complète d'un prestataire pour « Voir le profil » (#127). `contactRevealed`
 * décide de l'affichage en clair ou masqué (l'appelant sait si le contact a déjà
 * été engagé). Un id absent de l'annuaire de démo correspond à un vrai compte,
 * dont la fiche reprend sa propre bio/dispo/CV. Iso Nitro.
 */
export async function getProviderDetail(id: string, contactRevealed: boolean): Promise<ProviderDetail | null> {
  const provider = await getProviderById(id)
  if (!provider) return null

  const { rating, reviewCount } = await getEffectiveRating(id, { rating: provider.rating, reviewCount: provider.reviewCount })
  const experienceYears = estimateExperienceYears(reviewCount)
  const { phone, email } = derivedContact(provider)

  const realProfile = DIRECTORY.some((entry) => entry.id === id) ? null : await providerProfileService.getProviderProfile(id)

  const bio = realProfile?.description
    || `Prestataire ${provider.subSector.toLowerCase()} basé·e à ${provider.city}, ${experienceYears} an${experienceYears > 1 ? 's' : ''} d'expérience sur WorkTogo.`
  const availability = realProfile?.availability
    || (provider.verified ? 'Disponible sous 48h' : 'Disponibilité à confirmer avec le prestataire')
  const cvUrl = realProfile ? realProfile.cvUrl ?? null : provider.verified ? `/cv/${provider.id}.pdf` : null

  return {
    ...provider,
    rating,
    reviewCount,
    experienceYears,
    bio,
    availability,
    cvUrl,
    badges: { identity: provider.verified, skills: reviewCount >= 10 },
    phone: contactRevealed ? phone : maskPhone(phone),
    email: contactRevealed ? email : maskEmail(email),
    contactRevealed,
  }
}
