import type { Notification as PrismaNotification, NotificationType } from '@prisma/client'
import { isEmailConfigured, sendEmail } from '~~/server/utils/email'
import { prisma } from '~~/server/utils/prisma'
import { isSmsConfigured, sendSms } from '~~/server/utils/sms'
import { getUserById } from '~~/server/utils/userStore'

/**
 * Centre de notifications in-app (#360, premier incrément : nouveau message
 * reçu, côté chercheur comme prestataire). `userId` peut référencer un
 * compte réel ou, côté prestataire, un id de l'annuaire de démo (voir
 * conversationStore.ts) — pas de contrainte de clé étrangère, même choix que
 * Favorite/Complaint.
 */

export type { NotificationType }

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

export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body: string
  conversationId?: string
}): Promise<Notification> {
  const row = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      conversationId: params.conversationId ?? null,
    },
  })
  return toNotification(row)
}

const LIST_LIMIT = 30

/** Les plus récentes d'abord, plafonné à 30 (centre de notifications, pas un historique complet). */
export async function listNotifications(userId: string): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
  })
  return rows.map(toNotification)
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

/** Une notification déjà lue n'a pas déjà servi de déclencheur email/SMS pour éviter de spammer une conversation active — voir messages.post.ts. */
export async function hasUnreadNotificationForConversation(userId: string, conversationId: string): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: { userId, conversationId, readAt: null },
    select: { id: true },
  })
  return existing !== null
}

/** Marque toutes les notifications non lues d'un utilisateur comme lues (ouverture du centre de notifications). */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}

/**
 * Notifie le chercheur d'une mise à jour de son litige (réponse du
 * prestataire, voir escrowOrderStore.ts) — in-app uniquement, pas
 * d'email/SMS comme pour `notifyNewMessage` : l'action attendue se fait
 * depuis l'app (confirmer ou non que le travail est fait), un rappel in-app
 * suffit.
 */
export async function notifyDisputeUpdate(params: {
  recipientId: string
  conversationId: string
  title: string
  body: string
}): Promise<void> {
  const recipient = await getUserById(params.recipientId)
  if (!recipient) return
  await createNotification({ userId: params.recipientId, type: 'dispute_update', title: params.title, body: params.body, conversationId: params.conversationId })
}

const MESSAGE_PREVIEW_MAX_LENGTH = 140

/**
 * Notifie le destinataire d'un nouveau message (#360, premier incrément) :
 * crée toujours la notification in-app, et envoie en plus un email/SMS de
 * secours — sauf si le destinataire a déjà une notification non lue pour
 * cette même conversation (évite un email/SMS par message pendant une
 * rafale non lue, un seul suffit pour prévenir).
 *
 * `recipientId` peut référencer une fiche de l'annuaire de démo plutôt qu'un
 * vrai compte prestataire (voir conversationStore.ts) : dans ce cas
 * `getUserById` renvoie `null` et aucune notification n'est créée — personne
 * ne peut se connecter avec cet id pour la consulter de toute façon.
 */
export async function notifyNewMessage(params: {
  recipientId: string
  conversationId: string
  senderName: string
  messageBody: string
}): Promise<void> {
  const recipient = await getUserById(params.recipientId)
  if (!recipient) return

  const alreadyPending = await hasUnreadNotificationForConversation(params.recipientId, params.conversationId)

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
}
