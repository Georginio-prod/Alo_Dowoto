import { SECTORS } from '~~/app/data/sectors'

const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))

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

  const page = Math.max(1, Math.trunc(toNumber(query.page, 'Page invalide.') ?? 1))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(toNumber(query.pageSize, 'Taille de page invalide.') ?? DEFAULT_PAGE_SIZE)),
  )

  const matches = searchProviders({
    sector,
    subSectors: toList(query.sous_secteur),
    city: firstValue(query.ville),
    ratingMin,
    priceMax,
    query: firstValue(query.q),
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
