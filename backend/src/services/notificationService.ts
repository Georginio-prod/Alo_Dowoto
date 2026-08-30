import type { Notification as PrismaNotification, NotificationType } from '@prisma/client'
import { notificationRepository, type NotificationRepository } from '../repositories/notificationRepository'
import { userRepository, type UserRepository } from '../repositories/userRepository'
import { isEmailConfigured, sendEmail } from '../utils/email'
import { isSmsConfigured, sendSms } from '../utils/sms'

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

const MESSAGE_PREVIEW_MAX_LENGTH = 140

export function createNotificationService(
  repo: NotificationRepository = notificationRepository,
  users: UserRepository = userRepository,
) {
  async function createNotification(params: {
    userId: string
    type: NotificationType
    title: string
    body: string
    conversationId?: string
  }): Promise<Notification> {
    return toNotification(await repo.create(params))
  }

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

    createNotification,

    /**
     * Notifie le chercheur d'une mise à jour de son litige (réponse du
     * prestataire) — in-app uniquement, pas d'email/SMS. Iso `notifyDisputeUpdate`.
     */
    async notifyDisputeUpdate(params: { recipientId: string; conversationId: string; title: string; body: string }): Promise<void> {
      const recipient = await users.findById(params.recipientId)
      if (!recipient) return
      await createNotification({ userId: params.recipientId, type: 'dispute_update', title: params.title, body: params.body, conversationId: params.conversationId })
    },

    /**
     * Notifie le destinataire d'un nouveau message (#360) : crée toujours la
     * notification in-app, et envoie en plus un email/SMS de secours — sauf si
     * une notification non lue existe déjà pour cette conversation (évite un
     * email/SMS par message pendant une rafale non lue). `recipientId` peut
     * référencer une fiche de démo : `findById` renvoie `null`, rien n'est créé.
     * Iso `notifyNewMessage`.
     */
    async notifyNewMessage(params: { recipientId: string; conversationId: string; senderName: string; messageBody: string }): Promise<void> {
      const recipient = await users.findById(params.recipientId)
      if (!recipient) return

      const alreadyPending = await repo.hasUnreadForConversation(params.recipientId, params.conversationId)

      const preview = params.messageBody.length > MESSAGE_PREVIEW_MAX_LENGTH
        ? `${params.messageBody.slice(0, MESSAGE_PREVIEW_MAX_LENGTH)}…`
        : params.messageBody

      await createNotification({
        userId: params.recipientId,
        type: 'new_message',
        title: `Nouveau message de ${params.senderName}`,
        body: preview,
        conversationId: params.conversationId,
      })

      if (alreadyPending) return

      const subject = 'Nouveau message sur WorkTogo'
      const text = `${params.senderName} vous a envoyé un message sur WorkTogo :\n\n« ${preview} »\n\nRépondez directement depuis votre messagerie WorkTogo.`

      if (recipient.contact.includes('@')) {
        if (isEmailConfigured()) await sendEmail(recipient.contact, subject, text)
      } else if (isSmsConfigured()) {
        await sendSms(recipient.contact, text)
      }
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const notificationService = createNotificationService()
