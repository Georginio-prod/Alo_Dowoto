import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { requireSessionUser } from '../middleware/auth'
import { listNotifications, markNotificationsRead } from '../controllers/notificationController'

/**
 * Centre de notifications (#360), porté depuis `server/api/notifications/*`
 * (Phase 2, ADR-0017). Monté sous `/api` → `/api/notifications`, iso Nitro.
 * Réservé à un utilisateur connecté (401 sinon).
 */
export const notificationsRoutes = Router()

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: 30 dernières notifications + compteur de non-lues
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Notifications les plus récentes et compteur.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications: { type: array, items: { type: object } }
 *                 unreadCount: { type: integer }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
notificationsRoutes.get('/notifications', requireSessionUser, asyncHandler(listNotifications))

/**
 * @openapi
 * /notifications/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Marquer toutes les notifications comme lues
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Toutes marquées comme lues.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { ok: { type: boolean, example: true } } }
 *       401: { description: Non connecté., content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
notificationsRoutes.post('/notifications/read', requireSessionUser, asyncHandler(markNotificationsRead))
