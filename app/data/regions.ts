/**
 * Découpage géographique du Togo utilisé par la recherche de proximité et la
 * carte interactive (#geoloc). Structuré en données de configuration plutôt
 * qu'en valeurs codées en dur dans les composants : ajouter une région
 * (Plateaux, Centrale, Kara, Savanes) ne demande qu'une entrée ici, aucun
 * changement dans `searchProviders`, la carte ou le formulaire prestataire.
 *
 * Seule la Région Maritime est peuplée pour l'instant (zone de couverture
 * initiale de WorkTogo). Liste de quartiers établie à partir de connaissances
 * générales, non vérifiée face à une source administrative officielle — à
 * corriger si un découpage plus précis est fourni.
 */

export interface Quartier {
  slug: string
  name: string
}

export interface Prefecture {
  slug: string
  name: string
  quartiers: Quartier[]
}

export interface RegionBounds {
  south: number
  west: number
  north: number
  east: number
}

export interface Region {
  slug: string
  name: string
  /** Centre approximatif, pour initialiser la carte avant toute position plus précise. */
  center: { latitude: number; longitude: number }
  /** Emprise couverte par la carte (`maxBounds` Leaflet) — évite que l'utilisateur se retrouve hors du territoire pertinent (océan, pays voisins). */
  bounds: RegionBounds
  prefectures: Prefecture[]
}

export const REGIONS: Region[] = [
  {
    slug: 'maritime',
    name: 'Région Maritime',
    center: { latitude: 6.1319, longitude: 1.2228 },
    bounds: { south: 5.95, west: 0.75, north: 6.85, east: 1.95 },
    prefectures: [
      {
        slug: 'golfe',
        name: 'Golfe',
        quartiers: [
          { slug: 'be', name: 'Bè' },
          { slug: 'tokoin', name: 'Tokoin' },
          { slug: 'nyekonakpoe', name: 'Nyékonakpoè' },
          { slug: 'kodjoviakope', name: 'Kodjoviakopé' },
          { slug: 'hedzranawoe', name: 'Hédzranawoé' },
          { slug: 'akodessewa', name: 'Akodésséwa' },
          { slug: 'djidjole', name: 'Djidjolé' },
          { slug: 'kegue', name: 'Kégué' },
          { slug: 'totsi', name: 'Totsi' },
          { slug: 'amoutive', name: 'Amoutivé' },
          { slug: 'adawlato', name: 'Adawlato' },
          { slug: 'doulassame', name: 'Doulassamé' },
          { slug: 'baguida', name: 'Baguida' },
        ],
      },
      {
        slug: 'agoe-nyive',
        name: 'Agoè-Nyivé',
        quartiers: [
          { slug: 'agoe', name: 'Agoè' },
          { slug: 'adidogome', name: 'Adidogomé' },
          { slug: 'zanguera', name: 'Zanguéra' },
          { slug: 'adetikope', name: 'Adétikopé' },
        ],
      },
      {
        slug: 'lacs',
        name: 'Lacs',
        quartiers: [
          { slug: 'aneho', name: 'Aného' },
          { slug: 'glidji', name: 'Glidji' },
          { slug: 'agbodrafo', name: 'Agbodrafo' },
          { slug: 'djagble', name: 'Djagblé' },
        ],
      },
      {
        slug: 'vo',
        name: 'Vo',
        quartiers: [
          { slug: 'vogan', name: 'Vogan' },
          { slug: 'attitogon', name: 'Attitogon' },
        ],
      },
      {
        slug: 'yoto',
        name: 'Yoto',
        quartiers: [
          { slug: 'tabligbo', name: 'Tabligbo' },
          { slug: 'adakplame', name: 'Adakplamé' },
        ],
      },
      {
        slug: 'zio',
        name: 'Zio',
        quartiers: [
          { slug: 'tsevie', name: 'Tsévié' },
          { slug: 'assahoun', name: 'Assahoun' },
          { slug: 'davie', name: 'Davié' },
        ],
      },
      {
        slug: 'bas-mono',
        name: 'Bas-Mono',
        quartiers: [
          { slug: 'afagnan', name: 'Afagnan' },
          { slug: 'aklakou', name: 'Aklakou' },
        ],
      },
      {
        slug: 'ave',
        name: 'Avé',
        quartiers: [
          { slug: 'keve', name: 'Kévé' },
          { slug: 'amoussoukope', name: 'Amoussoukopé' },
        ],
      },
    ],
  },
]

/** Région couverte par défaut tant qu'une seule région est peuplée. */
export const DEFAULT_REGION_SLUG = 'maritime'

export function getRegionBySlug(slug: string): Region | undefined {
  return REGIONS.find((region) => region.slug === slug)
}

/** Tous les quartiers d'une région, toutes préfectures confondues (liste à plat pour un `<select>`). */
export function listQuartiers(regionSlug: string = DEFAULT_REGION_SLUG): Quartier[] {
  return getRegionBySlug(regionSlug)?.prefectures.flatMap((prefecture) => prefecture.quartiers) ?? []
}

export function findQuartierBySlug(slug: string, regionSlug: string = DEFAULT_REGION_SLUG): Quartier | undefined {
  return listQuartiers(regionSlug).find((quartier) => quartier.slug === slug)
}
