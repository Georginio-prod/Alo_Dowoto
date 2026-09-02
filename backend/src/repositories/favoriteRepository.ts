import type { Favorite, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des favoris client → prestataire (`prisma.favorite`, clé
 * composite `clientId_providerId`). Porté iso depuis
 * `server/utils/favoriteStore.ts` (ADR-0016). Client Prisma injecté (patron
 * Phase 1). `list`/`isFavorite` seront ajoutés avec le portage de GET
 * /api/favorites (différé : il enrichit chaque favori via l'annuaire
 * prestataires, non encore porté).
 */
export interface FavoriteRepository {
  /** Ajoute un favori. **Idempotent** : un second appel ne duplique rien ni ne réinitialise `createdAt`. */
  add(clientId: string, providerId: string): Promise<Favorite>
  /** Retire un favori. **Idempotent** : retirer un favori absent ne lève pas d'erreur. */
  remove(clientId: string, providerId: string): Promise<void>
  /** Favoris d'un client, les plus récents d'abord (#65, `GET /api/favorites`). */
  list(clientId: string): Promise<Favorite[]>
}

export function createFavoriteRepository(db: PrismaClient): FavoriteRepository {
  return {
    add(clientId, providerId) {
      return db.favorite.upsert({
        where: { clientId_providerId: { clientId, providerId } },
        update: {}, // déjà présent : on ne touche pas createdAt (idempotence)
        create: { clientId, providerId, createdAt: new Date(Date.now()) },
      })
    },
    async remove(clientId, providerId) {
      await db.favorite.deleteMany({ where: { clientId, providerId } })
    },
    list(clientId) {
      return db.favorite.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const favoriteRepository = createFavoriteRepository(prisma)
