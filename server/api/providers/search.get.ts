import { SECTORS } from '~~/app/data/sectors'
import type { ProviderSortOption } from '~~/server/utils/providerDirectory'

const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const VALID_SORT_OPTIONS = new Set<ProviderSortOption>(['note', 'prix_asc', 'prix_desc'])

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 50

function firstValue(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  }
  const single = firstValue(value)
  return single ? [single] : []
}

function toNumber(value: unknown, message: string): number | undefined {
  const raw = firstValue(value)
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) badRequest(message)
  return parsed
}

export default defineEventHandler((event) => {
  const query = getQuery(event)

  const sector = firstValue(query.secteur)
  if (sector && !VALID_SECTOR_SLUGS.has(sector)) {
    badRequest('Secteur invalide.')
  }

  const ratingMin = toNumber(query.note_min, 'Note minimum invalide.')
  if (ratingMin !== undefined && (ratingMin < 0 || ratingMin > 5)) {
    badRequest('Note minimum invalide.')
  }

  const priceMax = toNumber(query.prix_max, 'Prix maximum invalide.')
  if (priceMax !== undefined && priceMax < 0) {
    badRequest('Prix maximum invalide.')
  }

  // Distance réelle (#263) : optionnelle, coordonnées du chercheur envoyées
  // par le front quand disponibles (session utilisateur ou géolocalisation
  // navigateur) — repli sur le filtrage par ville si absentes ou invalides.
  const latitude = toNumber(query.lat, 'Latitude invalide.')
  const longitude = toNumber(query.lng, 'Longitude invalide.')
  const radiusKm = toNumber(query.rayon_km, 'Rayon de recherche invalide.')
  if (radiusKm !== undefined && radiusKm <= 0) {
    badRequest('Rayon de recherche invalide.')
  }

  const page = Math.max(1, Math.trunc(toNumber(query.page, 'Page invalide.') ?? 1))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(toNumber(query.pageSize, 'Taille de page invalide.') ?? DEFAULT_PAGE_SIZE)),
  )

  // Disponibilité en temps réel (#290) : par défaut la date du jour côté
  // store (searchProviders), mais un chercheur peut cibler une date précise.
  const date = firstValue(query.date)
  if (date !== undefined && !ISO_DATE_PATTERN.test(date)) {
    badRequest('Date invalide (format attendu : AAAA-MM-JJ).')
  }

  // Tri explicite de la barre de résultats (optionnel) : validé contre la
  // liste blanche, une valeur inconnue est rejetée plutôt qu'ignorée
  // silencieusement (cohérent avec les autres paramètres ci-dessus).
  const sortRaw = firstValue(query.tri)
  if (sortRaw !== undefined && !VALID_SORT_OPTIONS.has(sortRaw as ProviderSortOption)) {
    badRequest('Option de tri invalide.')
  }
  const sort = sortRaw as ProviderSortOption | undefined

  const matches = searchProviders({
    sector,
    subSectors: toList(query.sous_secteur),
    city: firstValue(query.ville),
    ratingMin,
    priceMax,
    query: firstValue(query.q),
    date,
    latitude,
    longitude,
    radiusKm,
    sort,
  })

  const total = matches.length
  const start = (page - 1) * pageSize

  return {
    results: matches.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  }
})
