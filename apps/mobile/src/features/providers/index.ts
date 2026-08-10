import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { request } from '@/services/http'

/**
 * Prestataire — champs RÉELS de l'API (server/utils/providerDirectory.ts) :
 * displayName, sector, subSector, city, verified, rating, reviewCount,
 * priceFrom, photoUrl, quartier, distanceKm.
 */
export const providerSchema = z.object({
  id: z.string(),
  displayName: z.string().optional().default(''),
  sector: z.string().optional(),
  subSector: z.string().optional(),
  city: z.string().optional().default(''),
  quartier: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  priceFrom: z.number().optional(),
  photoUrl: z.string().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  featured: z.boolean().optional(),
})
export type Provider = z.infer<typeof providerSchema>

/** Nom d'affichage sûr. */
export function providerName(p: Provider): string {
  return p.displayName || '—'
}
/** Ligne méta : sous-secteur · quartier/ville · distance. */
export function providerMeta(p: Provider): string {
  const place = [p.quartier, p.city].filter(Boolean).join(', ')
  return [p.subSector, place, p.distanceKm != null ? `${p.distanceKm.toFixed(1)} km` : null]
    .filter(Boolean)
    .join(' · ')
}

const listSchema = z.object({ providers: z.array(providerSchema) })

export interface SearchParams {
  q?: string
  sector?: string
  latitude?: number
  longitude?: number
  radius?: number
}

export function searchProviders(params: SearchParams) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.sector) qs.set('sector', params.sector)
  if (params.latitude != null) qs.set('latitude', String(params.latitude))
  if (params.longitude != null) qs.set('longitude', String(params.longitude))
  if (params.radius != null) qs.set('radius', String(params.radius))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/api/providers/search${suffix}`, { schema: listSchema })
}

export function featuredProviders() {
  return request('/api/providers/featured', { schema: listSchema })
}

export function getProvider(id: string) {
  return request(`/api/providers/${id}`, { schema: z.object({ provider: providerSchema }) })
}

export function useProviderSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ['providers', 'search', params],
    queryFn: () => searchProviders(params),
    enabled,
  })
}

export function useFeaturedProviders() {
  return useQuery({ queryKey: ['providers', 'featured'], queryFn: featuredProviders })
}

export function useProvider(id: string) {
  return useQuery({ queryKey: ['providers', id], queryFn: () => getProvider(id), enabled: !!id })
}
