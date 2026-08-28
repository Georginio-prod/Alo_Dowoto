import type { Request, Response } from 'express'
import { badRequest } from '../utils/apiError'
import { SECTORS } from '../data/sectors'
import { listAllQuartiers } from '../data/regions'
import { rankFeaturedProviders } from '../services/matchingEngine'
import {
  getEffectiveRating,
  getFeaturedCandidates,
  getProviderById,
  searchProviders,
  searchProvidersNearby,
  type FeaturedProviderResult,
  type ProviderSortOption,
} from '../services/providerDirectoryService'

/**
 * Recherche publique de prestataires (#43/#187/#263/#290), portée iso depuis
 * `server/api/providers/search.get.ts` et `providers/featured.get.ts` (ADR-0016).
 * Routes **publiques** (visibles sans compte). La validation des paramètres de
 * requête reste dans le handler, iso Nitro (mêmes listes blanches, mêmes messages).
 */

const VALID_QUARTIER_SLUGS = new Set(listAllQuartiers().map((quartier) => quartier.slug))
const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const VALID_SORT_OPTIONS = new Set<ProviderSortOption>(['note', 'prix_asc', 'prix_desc'])

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 50
const FEATURED_DEFAULT_LIMIT = 6
const FEATURED_MAX_LIMIT = 20

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

/** GET /api/providers/search → { results, total, page, pageSize, proximity }. */
export async function searchProvidersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query

  const sector = firstValue(query.secteur)
  if (sector && !VALID_SECTOR_SLUGS.has(sector)) badRequest('Secteur invalide.')

  const ratingMin = toNumber(query.note_min, 'Note minimum invalide.')
  if (ratingMin !== undefined && (ratingMin < 0 || ratingMin > 5)) badRequest('Note minimum invalide.')

  const priceMax = toNumber(query.prix_max, 'Prix maximum invalide.')
  if (priceMax !== undefined && priceMax < 0) badRequest('Prix maximum invalide.')

  const quartier = firstValue(query.quartier)
  if (quartier && !VALID_QUARTIER_SLUGS.has(quartier)) badRequest('Quartier invalide.')

  const latitude = toNumber(query.lat, 'Latitude invalide.')
  const longitude = toNumber(query.lng, 'Longitude invalide.')
  const radiusKm = toNumber(query.rayon_km, 'Rayon de recherche invalide.')
  if (radiusKm !== undefined && radiusKm <= 0) badRequest('Rayon de recherche invalide.')

  const page = Math.max(1, Math.trunc(toNumber(query.page, 'Page invalide.') ?? 1))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(toNumber(query.pageSize, 'Taille de page invalide.') ?? DEFAULT_PAGE_SIZE)),
  )

  const date = firstValue(query.date)
  if (date !== undefined && !ISO_DATE_PATTERN.test(date)) badRequest('Date invalide (format attendu : AAAA-MM-JJ).')

  const sortRaw = firstValue(query.tri)
  if (sortRaw !== undefined && !VALID_SORT_OPTIONS.has(sortRaw as ProviderSortOption)) badRequest('Option de tri invalide.')
  const sort = sortRaw as ProviderSortOption | undefined

  const baseFilters = {
    sector,
    subSectors: toList(query.sous_secteur),
    city: firstValue(query.ville),
    quartier,
    ratingMin,
    priceMax,
    query: firstValue(query.q),
    date,
    sort,
  }

  const nearby = latitude !== undefined && longitude !== undefined
    ? await searchProvidersNearby({ ...baseFilters, latitude, longitude }, radiusKm)
    : null

  const matches = nearby ? nearby.results : await searchProviders(baseFilters)

  const total = matches.length
  const start = (page - 1) * pageSize

  res.json({
    results: matches.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    proximity: nearby
      ? { requestedRadiusKm: nearby.requestedRadiusKm, usedRadiusKm: nearby.usedRadiusKm, widened: nearby.widened }
      : null,
  })
}

/** GET /api/providers/featured → { results } (mise en avant #187, publique). */
export async function featuredProviders(req: Request, res: Response): Promise<void> {
  const sector = firstValue(req.query.secteur)
  if (sector && !VALID_SECTOR_SLUGS.has(sector)) badRequest('Secteur invalide.')

  const rawLimit = firstValue(req.query.limit)
  const parsedLimit = rawLimit !== undefined ? Number(rawLimit) : NaN
  const limit = Number.isFinite(parsedLimit) ? Math.min(FEATURED_MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit))) : FEATURED_DEFAULT_LIMIT

  const ranked = rankFeaturedProviders(await getFeaturedCandidates(sector), undefined, limit)

  const results = (await Promise.all(
    ranked.map(async (result, index): Promise<FeaturedProviderResult | null> => {
      const provider = await getProviderById(result.providerId)
      if (!provider) return null
      const { rating, reviewCount } = await getEffectiveRating(provider.id, { rating: provider.rating, reviewCount: provider.reviewCount })
      return { ...provider, rating, reviewCount, featuredScore: result.total, badge: index === 0 ? 'top' : 'recommande' }
    }),
  )).filter((provider): provider is FeaturedProviderResult => provider !== null)

  res.json({ results })
}
