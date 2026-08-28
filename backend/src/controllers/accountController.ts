import type { Request, Response } from 'express'
import { authUser } from '../utils/authUser'
import { SESSION_COOKIE } from '../services/authService'
import { accountService } from '../services/accountService'

/**
 * Handlers des droits RGPD sur le compte (#286). Portés iso depuis
 * `server/api/account/*` (ADR-0016). Réservés à un utilisateur connecté
 * (`requireSessionUser` monté sur les routes).
 */

/** GET /api/account/export → données personnelles structurées (portabilité). */
export async function exportAccount(req: Request, res: Response): Promise<void> {
  res.json(await accountService.exportData(authUser(req)))
}

/** POST /api/account/delete → { ok: true }. Anonymise le compte et déconnecte. */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  await accountService.deleteAccount(authUser(req))
  // Efface le cookie de session (iso `deleteCookie(event, SESSION_COOKIE, { path: '/' })`).
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
}
