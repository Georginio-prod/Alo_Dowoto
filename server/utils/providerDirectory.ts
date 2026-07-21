import { SECTORS } from '~~/app/data/sectors'
import { isProviderAvailableOn, todayIsoDate } from '~~/server/utils/providerAvailabilityStore'
import { getAverageRating } from '~~/server/utils/reviewStore'
import { getProviderProfile, listProviderProfiles } from '~~/server/utils/providerStore'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import { isVerified } from '~~/server/utils/verificationStore'
import type { FeaturedCandidate } from '~~/server/utils/matchingEngine'

/**
 * Annuaire des prestataires consultable par la recherche publique (#43).
 *
 * Jeu de données de démonstration en mémoire (pas de base de données
 * encore en place, voir #45/#46) — reprend les prestataires visibles sur
 * la maquette des résultats pour le secteur « Ménage & Maison » et ajoute
 * quelques profils dans d'autres secteurs pour couvrir la recherche
 * multi-secteurs. Ces données seront remplacées par des lectures Prisma
 * (`ProviderProfile`) une fois la persistance branchée.
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
}

export interface ProviderSearchFilters {
  sector?: string
  subSectors?: string[]
  city?: string
  ratingMin?: number
  priceMax?: number
  query?: string
  /**
   * Date ISO (`AAAA-MM-JJ`) pour laquelle la disponibilité est vérifiée
   * (#290) — par défaut la date du jour (recherche « temps réel »). Un
   * prestataire ayant déclaré une période d'indisponibilité couvrant cette
   * date n'apparaît pas dans les résultats.
   */
  date?: string
}

const DIRECTORY: ProviderSearchResult[] = [
  { id: 'p01', displayName: 'Akofa M.', sector: 'menage', subSector: 'Ménage à domicile', city: 'Lomé', verified: true, rating: 4.8, reviewCount: 32, priceFrom: 3000, photoUrl: null },
  { id: 'p02', displayName: 'Kossi A.', sector: 'menage', subSector: 'Ménage à domicile', city: 'Lomé', verified: true, rating: 4.6, reviewCount: 18, priceFrom: 2500, photoUrl: null },
  { id: 'p03', displayName: 'Essolakina T.', sector: 'menage', subSector: 'Repassage', city: 'Lomé', verified: true, rating: 4.9, reviewCount: 54, priceFrom: 1500, photoUrl: null },
  { id: 'p04', displayName: 'Yawa D.', sector: 'menage', subSector: 'Jardinage', city: 'Kara', verified: false, rating: 4.3, reviewCount: 9, priceFrom: 4000, photoUrl: null },
  { id: 'p05', displayName: 'Komi S.', sector: 'menage', subSector: "Garde d'enfants", city: 'Lomé', verified: true, rating: 4.7, reviewCount: 27, priceFrom: 3500, photoUrl: null },
  { id: 'p06', displayName: 'Adjoa K.', sector: 'menage', subSector: 'Cuisine à domicile', city: 'Lomé', verified: false, rating: 4.5, reviewCount: 12, priceFrom: 5000, photoUrl: null },
  { id: 'p07', displayName: 'Mawuli N.', sector: 'menage', subSector: 'Ménage à domicile', city: 'Sokodé', verified: false, rating: 4.2, reviewCount: 6, priceFrom: 2000, photoUrl: null },
  { id: 'p08', displayName: 'Ablavi F.', sector: 'menage', subSector: 'Repassage', city: 'Kpalimé', verified: true, rating: 4.8, reviewCount: 21, priceFrom: 1800, photoUrl: null },
  { id: 'p09', displayName: 'Kokou B.', sector: 'btp', subSector: 'Plomberie', city: 'Lomé', verified: true, rating: 4.4, reviewCount: 15, priceFrom: 4500, photoUrl: null },
  { id: 'p10', displayName: 'Sena A.', sector: 'digital', subSector: 'Développement web & mobile', city: 'Lomé', verified: true, rating: 4.9, reviewCount: 40, priceFrom: 6000, photoUrl: null },
  { id: 'p11', displayName: 'Afi D.', sector: 'beaute', subSector: 'Coiffure', city: 'Kara', verified: false, rating: 4.1, reviewCount: 5, priceFrom: 1500, photoUrl: null },
  { id: 'p12', displayName: 'Yao T.', sector: 'evenement', subSector: 'Traiteur', city: 'Atakpamé', verified: true, rating: 4.6, reviewCount: 22, priceFrom: 5500, photoUrl: null },
  { id: 'p13', displayName: 'Edem K.', sector: 'transport', subSector: 'Déménagement', city: 'Dapaong', verified: false, rating: 3.9, reviewCount: 3, priceFrom: 3500, photoUrl: null },
  { id: 'p14', displayName: 'Nadia P.', sector: 'menage', subSector: "Garde d'enfants", city: 'Kpalimé', verified: false, rating: 3.6, reviewCount: 4, priceFrom: 2500, photoUrl: null },
]

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Convertit un vrai profil prestataire (compte inscrit, server/utils/providerStore.ts)
 * au même format que l'annuaire de démonstration, pour qu'il apparaisse
 * dans la recherche publique au même titre qu'une fiche de démo (#43 → vrais
 * comptes). Pas de sous-secteur dédié côté profil réel pour l'instant (seul
 * le secteur est collecté à l'inscription, voir profil-professionnel.vue) :
 * on retombe sur le nom du secteur, cohérent avec l'affichage
 * `{{ subSector }} · {{ city }}` de ProviderCard.vue.
 */
function toSearchResult(profile: ProviderProfile): ProviderSearchResult {
  const sectorName = SECTORS.find((sector) => sector.slug === profile.sector)?.name ?? profile.sector
  return {
    id: profile.userId,
    displayName: profile.displayName,
    sector: profile.sector,
    subSector: sectorName,
    city: profile.city ?? '',
    verified: isVerified(profile.userId),
    rating: 0,
    reviewCount: 0,
    priceFrom: profile.rateFrom ?? 0,
    photoUrl: profile.photoUrl ?? null,
  }
}

/**
 * Annuaire de démonstration + vrais comptes prestataires, fusionnés en un
 * seul jeu de résultats. Un vrai compte apparaît dès l'inscription (secteur
 * et localisation sont obligatoires, voir resolveRequiredOnboardingFields),
 * pas seulement une fois son profil professionnel complété.
 */
function allProviders(): ProviderSearchResult[] {
  return [...DIRECTORY, ...listProviderProfiles().map(toSearchResult)]
}

/** Retrouve une fiche par id, dans l'annuaire de démo ou parmi les vrais comptes (ex. utilisé par la messagerie, #59). */
export function getProviderById(id: string): ProviderSearchResult | null {
  return allProviders().find((provider) => provider.id === id) ?? null
}

export function searchProviders(filters: ProviderSearchFilters): ProviderSearchResult[] {
  const query = filters.query ? normalize(filters.query) : ''
  const availabilityDate = filters.date ?? todayIsoDate()

  return allProviders().filter((provider) => {
    if (filters.sector && provider.sector !== filters.sector) return false
    if (filters.subSectors?.length && !filters.subSectors.includes(provider.subSector)) return false
    if (filters.city && provider.city !== filters.city) return false
    if (filters.ratingMin !== undefined && provider.rating < filters.ratingMin) return false
    if (filters.priceMax !== undefined && provider.priceFrom > filters.priceMax) return false
    if (!isProviderAvailableOn(provider.id, availabilityDate)) return false
    if (query) {
      const haystack = normalize(`${provider.displayName} ${provider.subSector} ${provider.city}`)
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

/**
 * Nombre de prestataires de l'annuaire pour un secteur donné (#66, grille
 * `/categories`). Repose sur `searchProviders` pour rester cohérent avec le
 * filtrage utilisé par la recherche publique.
 */
export function countBySector(sector: string): number {
  return searchProviders({ sector }).length
}

/**
 * Note/nombre d'avis « effectifs » d'un prestataire (#61) : dès qu'au moins
 * un avis existe pour son id dans `reviewStore` (notations mutuelles de
 * fin de collaboration), la moyenne recalculée prévaut sur la valeur figée
 * de l'annuaire de démo. Sans avis, on retombe sur la fiche de l'annuaire.
 * Point d'extension unique utilisé par `requestStore.toCandidate` pour que
 * le moteur de scoring (#54) reflète immédiatement les nouvelles
 * notations, sans dupliquer cette logique dans chaque appelant.
 */
export function getEffectiveRating(providerId: string): { rating: number, reviewCount: number } {
  const { average, count } = getAverageRating(providerId)
  if (count > 0) return { rating: average, reviewCount: count }

  const provider = getProviderById(providerId)
  return { rating: provider?.rating ?? 0, reviewCount: provider?.reviewCount ?? 0 }
}

/**
 * Tarif fixe d'un prestataire pour le paiement bloquant en séquestre (#194)
 * — cette itération ne gère que le tarif fixe affiché, pas le devis à
 * valider (choix produit à trancher, voir l'epic #191). Priorité à la fiche
 * de démonstration (ids `p01`..`p14`, voir en-tête de fichier) puis, à
 * défaut, au tarif renseigné par un vrai compte prestataire. `null` si
 * aucun tarif n'est disponible (le prestataire n'a pas encore configuré son
 * tarif de base) — vérifie directement `providerStore` plutôt que
 * `getProviderById`, dont la fiche fusionnée (#43 → vrais comptes) retombe
 * sur `0` par défaut et masquerait ce cas.
 */
export function resolveProviderRate(providerId: string): number | null {
  const directoryEntry = DIRECTORY.find((provider) => provider.id === providerId)
  if (directoryEntry) return directoryEntry.priceFrom
  return getProviderProfile(providerId)?.rateFrom ?? null
}

/** Approximation du nombre d'années d'expérience à partir du nombre d'avis (pas de champ dédié pour l'instant). */
export function estimateExperienceYears(reviewCount: number): number {
  return Math.max(1, Math.round(reviewCount / 8))
}

/**
 * Candidats prêts à être classés par `rankFeaturedProviders` (#187) : reprend
 * la note effective (#61) et approxime l'ancienneté à partir du nombre
 * d'avis, comme `getProviderDetail`. `sector`, s'il est fourni, restreint la
 * mise en avant aux prestataires de ce secteur (cohérence avec la page
 * consultée) — sinon tout l'annuaire est éligible.
 */
export function getFeaturedCandidates(sector?: string): FeaturedCandidate[] {
  const providers = searchProviders(sector ? { sector } : {})
  return providers.map((provider) => {
    const { rating, reviewCount } = getEffectiveRating(provider.id)
    return {
      providerId: provider.id,
      rating,
      reviewCount,
      verified: provider.verified,
      experienceYears: estimateExperienceYears(reviewCount),
    }
  })
}

/** Fiche prestataire enrichie du score de mise en avant (#187, accueil chercheur). */
export interface FeaturedProviderResult extends ProviderSearchResult {
  featuredScore: number
  badge: 'top' | 'recommande'
}

export interface ProviderDetail extends ProviderSearchResult {
  rating: number
  reviewCount: number
  /** Approximation dérivée du nombre d'avis (pas de champ dédié, cf. requestStore.toCandidate). */
  experienceYears: number
  bio: string
  availability: string
  cvUrl: string | null
  badges: { identity: boolean, skills: boolean }
  phone: string
  email: string
  /** Coordonnées démasquées ou non (#127) — voir `getProviderDetail`. */
  contactRevealed: boolean
}

/** Coordonnées de démonstration dérivées de façon stable à partir de l'id (annuaire de démo, #43). */
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
 * Fiche complète d'un prestataire pour la fenêtre « Voir le profil » (#127).
 * `contactRevealed` détermine si les coordonnées sont affichées en clair ou
 * partiellement masquées — laissé à la charge de l'appelant (la route API
 * sait, elle, si l'utilisateur courant a déjà engagé le contact).
 */
export function getProviderDetail(id: string, contactRevealed: boolean): ProviderDetail | null {
  const provider = getProviderById(id)
  if (!provider) return null

  const { rating, reviewCount } = getEffectiveRating(id)
  const experienceYears = estimateExperienceYears(reviewCount)
  const { phone, email } = derivedContact(provider)

  // Un id absent de l'annuaire de démo correspond à un vrai compte
  // prestataire (#43 → vrais comptes) : sa fiche reprend sa propre
  // description/disponibilité/CV (hub /profil) plutôt que le texte
  // générique de démo.
  const realProfile = DIRECTORY.some((entry) => entry.id === id) ? null : getProviderProfile(id)

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
