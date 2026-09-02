import type { Request, Response } from 'express'
import { badRequest } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { favoriteService } from '../services/favoriteService'
import { getProviderById } from '../services/providerDirectoryService'
import type { AddFavoriteInput } from '../validation/schemas/favorites'

/**
 * Handlers des favoris (#65). Portés iso depuis `server/api/favorites/*` (ADR-0016).
 * Réservés au rôle **client** — la garde `requireClientRole` (montée sur la route)
 * a déjà résolu `req.user` (401 sinon, 403 si mauvais rôle). Le corps du POST est
 * validé/normalisé en amont par `validateBody`.
 */

/** GET /api/favorites → `{ favorites }`. Chaque favori est enrichi de sa fiche annuaire (ou `provider: null` si hors annuaire, #43). */
export async function listFavorites(req: Request, res: Response): Promise<void> {
  const clientId = authUser(req).id
  const favorites = await Promise.all(
    (await favoriteService.listFavorites(clientId)).map(async (favorite) => ({
      providerId: favorite.providerId,
      createdAt: favorite.createdAt,
      provider: await getProviderById(favorite.providerId),
    })),
  )
  res.json({ favorites })
}

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
