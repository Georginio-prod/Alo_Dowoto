import type { Request, Response } from 'express'
import { badRequest } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { favoriteService } from '../services/favoriteService'
import type { AddFavoriteInput } from '../validation/schemas/favorites'

/**
 * Handlers des favoris (#65). Portés iso depuis `server/api/favorites/*` (ADR-0016).
 * Réservés au rôle **client** — la garde `requireClientRole` (montée sur la route)
 * a déjà résolu `req.user` (401 sinon, 403 si mauvais rôle). Le corps du POST est
 * validé/normalisé en amont par `validateBody`.
 *
 * GET /api/favorites n'est PAS encore porté : il enrichit chaque favori via
 * l'annuaire prestataires (`getProviderById`), domaine non encore extrait.
 */

/** POST /api/favorites → 201 `{ favorite }`. Ajout idempotent. */
export async function createFavorite(req: Request, res: Response): Promise<void> {
  const { providerId } = req.body as AddFavoriteInput
  const favorite = await favoriteService.addFavorite(authUser(req).id, providerId)
  res.status(201).json({ favorite })
}

/** DELETE /api/favorites/:providerId → `{ ok: true }`. Retrait idempotent. */
export async function deleteFavorite(req: Request, res: Response): Promise<void> {
  const providerId = req.params.providerId
  if (!providerId) badRequest('Identifiant du prestataire manquant.')
  await favoriteService.removeFavorite(authUser(req).id, providerId)
  res.json({ ok: true })
}
