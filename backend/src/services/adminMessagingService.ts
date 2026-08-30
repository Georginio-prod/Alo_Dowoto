import { notificationRepository } from '../repositories/notificationRepository'

/**
 * Message direct de l'équipe WorkTogo à un utilisateur (#dashboard-admin),
 * porté iso depuis `server/utils/adminMessaging.ts` (ADR-0017) — livré comme
 * notification in-app réelle, visible dans le centre de notifications. Pas de
 * canal email/SMS : un message admin reste dans l'app.
 */
export async function sendAdminMessage(userId: string, title: string, body: string): Promise<void> {
  await notificationRepository.create({ userId, type: 'admin_message', title, body })
}
