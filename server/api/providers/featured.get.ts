import { SECTORS } from '~~/app/data/sectors'
import { rankFeaturedProviders } from '~~/server/utils/matchingEngine'
import {
  getEffectiveRating,
  getFeaturedCandidates,
  getProviderById,
  type FeaturedProviderResult,
} from '~~/server/utils/providerDirectory'

/**
 * « Meilleurs prestataires » de l'accueil chercheur (#187) : classement
 * calculé dynamiquement à chaque appel (pas de liste figée) à partir du
 * score de mise en avant (`rankFeaturedProviders`), lui-même basé sur une
 * moyenne bayésienne des avis plutôt qu'une simple moyenne — un unique avis
 * 5★ ne doit pas écraser des prestataires établis avec de nombreux avis.
 *
 * Route publique, comme `/api/providers/search` : la mise en avant est
 * visible même sans compte (accueil de recherche public).
 */

const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))
const DEFAULT_LIMIT = 6
const MAX_LIMIT = 20

function firstValue(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined
}

export default defineEventHandler(async (event): Promise<{ results: FeaturedProviderResult[] }> => {
  const query = getQuery(event)

  const sector = firstValue(query.secteur)
  if (sector && !VALID_SECTOR_SLUGS.has(sector)) {
    badRequest('Secteur invalide.')
  }

  const rawLimit = firstValue(query.limit)
  const parsedLimit = rawLimit !== undefined ? Number(rawLimit) : NaN
  const limit = Number.isFinite(parsedLimit) ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit))) : DEFAULT_LIMIT

  const ranked = rankFeaturedProviders(await getFeaturedCandidates(sector), undefined, limit)

  const results = (await Promise.all(
    ranked.map(async (result, index): Promise<FeaturedProviderResult | null> => {
      const provider = await getProviderById(result.providerId)
      if (!provider) return null
      // Même note effective (#61) que celle utilisée pour le classement,
      // pour que la carte affichée reste cohérente avec le score qui l'a
      // sélectionnée (voir requestStore.computeMatches, même principe).
      const { rating, reviewCount } = await getEffectiveRating(provider.id, { rating: provider.rating, reviewCount: provider.reviewCount })
      return {
        ...provider,
        rating,
        reviewCount,
        featuredScore: result.total,
        badge: index === 0 ? 'top' : 'recommande',
      }
    }),
  )).filter((provider): provider is FeaturedProviderResult => provider !== null)

  return { results }
})
