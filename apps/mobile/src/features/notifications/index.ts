import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/services/http'

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string().optional().default(''),
  body: z.string().optional().default(''),
  read: z.boolean().optional().default(false),
  createdAt: z.string().optional(),
})
export type Notification = z.infer<typeof notificationSchema>

export function listNotifications() {
  return request('/api/notifications', {
    schema: z.object({ notifications: z.array(notificationSchema) }),
  })
}
export function markRead(ids: string[]) {
  return request('/api/notifications/read', { method: 'POST', body: { ids } })
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: listNotifications })
}
export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => markRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
