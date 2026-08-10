import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/services/http'

/** Vérification d'identité (KYC), parrainage, favoris. */

export const verificationSchema = z.object({
  status: z.enum(['none', 'pending', 'verified', 'rejected']).optional().default('none'),
})

export function getVerification() {
  return request('/api/verification/me', { schema: verificationSchema })
}
export function submitVerification(body: { idCardUrl: string; selfieUrl: string }) {
  return request('/api/verification', { method: 'POST', body })
}
export function getReferrals() {
  return request('/api/referrals/me', {
    schema: z.object({ code: z.string().optional(), count: z.number().optional().default(0) }),
  })
}

export const favoriteSchema = z.object({ providerId: z.string(), name: z.string().optional() })
export function listFavorites() {
  return request('/api/favorites', { schema: z.object({ favorites: z.array(favoriteSchema) }) })
}
export function addFavorite(providerId: string) {
  return request('/api/favorites', { method: 'POST', body: { providerId } })
}
export function removeFavorite(providerId: string) {
  return request(`/api/favorites/${providerId}`, { method: 'DELETE' })
}

export function useVerification() {
  return useQuery({ queryKey: ['verification'], queryFn: getVerification })
}
export function useReferrals() {
  return useQuery({ queryKey: ['referrals'], queryFn: getReferrals })
}
export function useFavorites() {
  return useQuery({ queryKey: ['favorites'], queryFn: listFavorites })
}
export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { providerId: string; on: boolean }) =>
      v.on ? addFavorite(v.providerId) : removeFavorite(v.providerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  })
}
