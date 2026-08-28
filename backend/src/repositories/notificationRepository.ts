import type { Notification, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données du centre de notifications (`prisma.notification`). Porté iso
 * depuis `server/utils/notificationStore.ts` (ADR-0016). Client Prisma injecté.
 * Seules les opérations des routes portées (`GET /notifications`,
 * `POST /notifications/read`) sont exposées ici.
 */
const LIST_LIMIT = 30

export interface NotificationRepository {
  /** Les plus récentes d'abord, plafonné à 30 (centre, pas historique complet). */
  listRecent(userId: string): Promise<Notification[]>
  countUnread(userId: string): Promise<number>
  markAllRead(userId: string): Promise<void>
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
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const notificationRepository = createNotificationRepository(prisma)
