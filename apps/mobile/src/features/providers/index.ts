import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { request } from '@/services/http'

/** Prestataire (résultats de recherche, profil public). */
export const providerSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(''),
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  sector: z.string().optional(),
  rating: z.number().optional(),
  reviewsCount: z.number().optional(),
  location: z.string().optional().default(''),
  distanceKm: z.number().optional(),
  avatarUrl: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  pricePerHour: z.number().optional(),
})
export type Provider = z.infer<typeof providerSchema>

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
