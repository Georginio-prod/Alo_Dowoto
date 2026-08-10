import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/services/http'

/** Paiement de l'avance (Mobile Money) + portefeuille. */

export const paymentSchema = z.object({
  id: z.string(),
  amount: z.number().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
  createdAt: z.string().optional(),
  reference: z.string().optional(),
})
export type Payment = z.infer<typeof paymentSchema>

export const walletSchema = z.object({
  balance: z.number().optional().default(0),
  currency: z.string().optional().default('XOF'),
  movements: z
    .array(
      z.object({
        id: z.string(),
        amount: z.number(),
        label: z.string().optional().default(''),
        createdAt: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
})
export type Wallet = z.infer<typeof walletSchema>

export function initiatePayment(conversationId: string, method: string) {
  return request('/api/payments/initiate', {
    method: 'POST',
    body: { conversationId, method },
    schema: z.object({ payment: paymentSchema }),
  })
}
export function getWallet() {
  return request('/api/wallet/me', { schema: walletSchema })
}
export function rechargeWallet(amount: number, method: string) {
  return request('/api/wallet/recharge', { method: 'POST', body: { amount, method } })
}

export function useWallet() {
  return useQuery({ queryKey: ['wallet'], queryFn: getWallet })
}
export function useInitiatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { conversationId: string; method: string }) =>
      initiatePayment(v.conversationId, v.method),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}
export function useRecharge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { amount: number; method: string }) => rechargeWallet(v.amount, v.method),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet'] }),
  })
}
