import type { Notification as PrismaNotification, NotificationType } from '@prisma/client'
import { notificationRepository, type NotificationRepository } from '../repositories/notificationRepository'

/**
 * Centre de notifications in-app (#360). Logique **portée iso** depuis
 * `server/utils/notificationStore.ts` (ADR-0016). Agnostique du framework.
 */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  conversationId: string | null
  readAt: number | null
  createdAt: number
}

function toNotification(row: PrismaNotification): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    conversationId: row.conversationId,
    readAt: row.readAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
  }
}

export function createNotificationService(repo: NotificationRepository = notificationRepository) {
  return {
    async listNotifications(userId: string): Promise<Notification[]> {
      return (await repo.listRecent(userId)).map(toNotification)
    },
    countUnread(userId: string): Promise<number> {
      return repo.countUnread(userId)
    },
    async markAllRead(userId: string): Promise<void> {
      await repo.markAllRead(userId)
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const notificationService = createNotificationService()
