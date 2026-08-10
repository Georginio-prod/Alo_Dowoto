import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/services/http'

/** Abonnement prestataire (formules). */
export const subscriptionSchema = z.object({
  slug: z.enum(['mensuel', 'trimestriel', 'annuel']).nullable().optional(),
  active: z.boolean().optional().default(false),
  trial: z.boolean().optional().default(false),
  expiresAt: z.string().nullable().optional(),
})
export type Subscription = z.infer<typeof subscriptionSchema>

export function getSubscription() {
  return request('/api/subscriptions/me', { schema: z.object({ subscription: subscriptionSchema }) })
}
export function subscribe(slug: string, method: string) {
  return request('/api/subscriptions', { method: 'POST', body: { slug, method } })
}
export function startTrial() {
  return request('/api/subscriptions/trial', { method: 'POST' })
}

export function useSubscription() {
  return useQuery({ queryKey: ['subscription'], queryFn: getSubscription })
}
export function useSubscribe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { slug: string; method: string }) => subscribe(v.slug, v.method),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription'] }),
  })
}
export function useStartTrial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: startTrial,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription'] }),
  })
}
