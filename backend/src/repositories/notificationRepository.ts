import type { Notification, NotificationType, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données du centre de notifications (`prisma.notification`). Porté iso
 * depuis `server/utils/notificationStore.ts` (ADR-0016). Client Prisma injecté.
 * Seules les opérations des routes portées (`GET /notifications`,
 * `POST /notifications/read`) sont exposées ici.
 */
const LIST_LIMIT = 30

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  conversationId?: string
}

export interface NotificationRepository {
  /** Les plus récentes d'abord, plafonné à 30 (centre, pas historique complet). */
  listRecent(userId: string): Promise<Notification[]>
  countUnread(userId: string): Promise<number>
  markAllRead(userId: string): Promise<void>
  create(input: CreateNotificationInput): Promise<Notification>
  /** Une notification non lue existe-t-elle déjà pour cette conversation (#360) ? */
  hasUnreadForConversation(userId: string, conversationId: string): Promise<boolean>
}

export function createNotificationRepository(db: PrismaClient): NotificationRepository {
  return {
    listRecent(userId) {
      return db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: LIST_LIMIT })
    },
    countUnread(userId) {
      return db.notification.count({ where: { userId, readAt: null } })
    },
    async markAllRead(userId) {
      await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
    },
    create(input) {
      return db.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          conversationId: input.conversationId ?? null,
        },
      })
    },
    async hasUnreadForConversation(userId, conversationId) {
      const existing = await db.notification.findFirst({ where: { userId, conversationId, readAt: null }, select: { id: true } })
      return existing !== null
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const notificationRepository = createNotificationRepository(prisma)
