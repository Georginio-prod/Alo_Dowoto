import type { Request, Response } from 'express'
import { notificationService } from '../services/notificationService'

/**
 * Handlers du centre de notifications (#360). Portés iso depuis
 * `server/api/notifications/*` (ADR-0016). Réservés à un utilisateur connecté
 * (`requireSessionUser` monté sur les routes).
 */

/** GET /api/notifications → { notifications, unreadCount } (30 plus récentes + compteur). */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id
  const [notifications, unreadCount] = await Promise.all([
    notificationService.listNotifications(userId),
    notificationService.countUnread(userId),
  ])
  res.json({ notifications, unreadCount })
}

/** POST /api/notifications/read → { ok: true } (marque tout comme lu). */
export async function markNotificationsRead(req: Request, res: Response): Promise<void> {
  await notificationService.markAllRead(req.user!.id)
  res.json({ ok: true })
}
