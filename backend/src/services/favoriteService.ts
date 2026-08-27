import type { Favorite as PrismaFavorite } from '@prisma/client'
import { favoriteRepository, type FavoriteRepository } from '../repositories/favoriteRepository'

/**
 * Favoris client → prestataire (#65). Logique **portée iso** depuis
 * `server/utils/favoriteStore.ts` (ADR-0016). Agnostique du framework
 * (repository Prisma injecté). L'ajout est idempotent (upsert), le retrait
 * aussi (delete best-effort).
 */

export interface Favorite {
  clientId: string
  providerId: string
  createdAt: number
}

function toFavorite(row: PrismaFavorite): Favorite {
  return { clientId: row.clientId, providerId: row.providerId, createdAt: row.createdAt.getTime() }
}

export function createFavoriteService(repo: FavoriteRepository = favoriteRepository) {
  return {
    async addFavorite(clientId: string, providerId: string): Promise<Favorite> {
      return toFavorite(await repo.add(clientId, providerId))
    },
    async removeFavorite(clientId: string, providerId: string): Promise<void> {
      await repo.remove(clientId, providerId)
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const favoriteService = createFavoriteService()
