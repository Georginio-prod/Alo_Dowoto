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

/** Retrouve une fiche de l'annuaire par id (ex. utilisé par la messagerie, #59). */
export function getProviderById(id: string): ProviderSearchResult | null {
  return DIRECTORY.find((provider) => provider.id === id) ?? null
}

export function searchProviders(filters: ProviderSearchFilters): ProviderSearchResult[] {
  const query = filters.query ? normalize(filters.query) : ''

  return DIRECTORY.filter((provider) => {
    if (filters.sector && provider.sector !== filters.sector) return false
    if (filters.subSectors?.length && !filters.subSectors.includes(provider.subSector)) return false
    if (filters.city && provider.city !== filters.city) return false
    if (filters.ratingMin !== undefined && provider.rating < filters.ratingMin) return false
    if (filters.priceMax !== undefined && provider.priceFrom > filters.priceMax) return false
    if (query) {
      const haystack = normalize(`${provider.displayName} ${provider.subSector} ${provider.city}`)
      if (!haystack.includes(query)) return false
    }
    return true
  })
}
