import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/services/http'
import type { EscrowStatus } from '@/features/pricing/types'

/**
 * Missions = conversations + commande escrow (server/api/conversations/[id]/*).
 * Chaque action escrow est une mutation dédiée, avec mise à jour optimiste sur
 * les transitions rapides (Phase 3).
 */

export const conversationSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  clientId: z.string().optional(),
  // Champs réels de l'API (toConversationSummary) :
  otherPartyName: z.string().optional().default('Utilisateur'),
  otherPartySector: z.string().nullable().optional(),
  sectorSlug: z.string().nullable().optional(),
  lastMessage: z
    .object({ body: z.string().optional().default(''), createdAt: z.union([z.string(), z.number()]).optional() })
    .nullable()
    .optional(),
  unreadCount: z.number().optional().default(0),
  firstContactDone: z.boolean().optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  // Séquestre (présent sur le détail /[id], absent de la liste) :
  status: z
    .enum(['awaiting_payment', 'in_escrow', 'delivered', 'released', 'refunded', 'disputed'])
    .optional(),
  amount: z.number().optional(),
  scheduledAt: z.string().optional(),
  location: z.string().optional().default(''),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
})
export type Conversation = z.infer<typeof conversationSchema>

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string().optional(),
  authorId: z.string().optional(),
  body: z.string().optional().default(''),
  createdAt: z.string().optional(),
  mine: z.boolean().optional(),
})
export type Message = z.infer<typeof messageSchema>

const listSchema = z.object({ conversations: z.array(conversationSchema) })
const oneSchema = z.object({ conversation: conversationSchema })
const messagesSchema = z.object({ messages: z.array(messageSchema) })

export function listConversations() {
  return request('/api/conversations', { schema: listSchema })
}
export function getConversation(id: string) {
  return request(`/api/conversations/${id}`, { schema: oneSchema })
}
export function getMessages(id: string) {
  return request(`/api/conversations/${id}/messages`, { schema: messagesSchema })
}
export function sendMessage(id: string, body: string) {
  return request(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } })
}

/** Action escrow générique (POST sans corps sauf raison). */
function action(id: string, verb: string, body?: unknown) {
  return request(`/api/conversations/${id}/${verb}`, { method: 'POST', body })
}

export const missionActions = {
  pay: (id: string) => action(id, 'pay'),
  checkIn: (id: string, coords?: { latitude: number; longitude: number }) =>
    action(id, 'check-in', coords),
  checkOut: (id: string) => action(id, 'check-out'),
  deliver: (id: string) => action(id, 'deliver'),
  receive: (id: string) => action(id, 'receive'),
  confirmOrder: (id: string) => action(id, 'confirm-order'),
  review: (id: string, rating: number, comment: string) => action(id, 'review', { rating, comment }),
  dispute: (id: string, reason: string) => action(id, 'dispute', { reason }),
  proposeReschedule: (id: string, scheduledAt: string) =>
    action(id, 'propose-reschedule', { scheduledAt }),
  shareLocation: (id: string, coords: { latitude: number; longitude: number }) =>
    action(id, 'share-location', coords),
  cancel: (id: string, reason: string) => action(id, 'cancel', { reason }),
}

// ---- Hooks ----

export function useConversations() {
  return useQuery({ queryKey: ['conversations'], queryFn: listConversations })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => getConversation(id),
    enabled: !!id,
  })
}

export function useMessages(id: string) {
  return useQuery({
    queryKey: ['conversations', id, 'messages'],
    queryFn: () => getMessages(id),
    enabled: !!id,
    refetchInterval: 15_000, // fil de discussion vivant
  })
}

export function useSendMessage(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => sendMessage(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations', id, 'messages'] }),
  })
}

/** Mutation d'action escrow avec invalidation + mise à jour optimiste du statut. */
export function useMissionAction(id: string, verb: keyof typeof missionActions, next?: EscrowStatus) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (arg?: unknown) => {
      const fn = missionActions[verb] as (id: string, a?: unknown) => Promise<unknown>
      return fn(id, arg)
    },
    onMutate: async () => {
      if (!next) return
      await qc.cancelQueries({ queryKey: ['conversations', id] })
      const prev = qc.getQueryData<{ conversation: Conversation }>(['conversations', id])
      if (prev) {
        qc.setQueryData(['conversations', id], {
          conversation: { ...prev.conversation, status: next },
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx && 'prev' in ctx && ctx.prev) qc.setQueryData(['conversations', id], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      qc.invalidateQueries({ queryKey: ['conversations', id] })
    },
  })
}

export { oneSchema }
