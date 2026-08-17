import { createNotification } from '~~/server/utils/notificationStore'

/**
 * Message direct de l'équipe WorkTogo à un utilisateur (#dashboard-admin,
 * modules Prestataires/Chercheurs) — livré comme notification in-app réelle
 * (server/utils/notificationStore.ts, Prisma), visible dans le centre de
 * notifications existant de l'utilisateur. Pas de canal email/SMS ici
 * (contrairement à notifyNewMessage) : un message admin reste dans l'app.
 */
export async function sendAdminMessage(userId: string, title: string, body: string): Promise<void> {
  await createNotification({ userId, type: 'admin_message', title, body })
}
