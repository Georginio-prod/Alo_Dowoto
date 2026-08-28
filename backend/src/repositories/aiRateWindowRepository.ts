import type { PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Fenêtres fixes de limitation de débit de l'assistant IA (`prisma.aiRateWindow`,
 * #geoloc 2.2), porté iso depuis `server/utils/aiRateLimiter.ts` (ADR-0016).
 * Persisté (partagé entre instances, survit aux redéploiements). Client Prisma
 * injecté ; la logique de fenêtre/plafond reste au service.
 */
export interface AiRateWindowRepository {
  /** Purge les fenêtres antérieures à `before` (housekeeping). */
  purgeOlderThan(before: Date): Promise<void>
  /** Incrémente atomiquement le compteur de (clé, fenêtre) et renvoie sa nouvelle valeur. */
  incrementAndCount(key: string, windowStart: Date): Promise<number>
  /** Réinitialise le compteur d'une clé (toutes fenêtres). */
  reset(key: string): Promise<void>
}

export function createAiRateWindowRepository(db: PrismaClient): AiRateWindowRepository {
  return {
    async purgeOlderThan(before) {
      await db.aiRateWindow.deleteMany({ where: { windowStart: { lt: before } } })
    },
    async incrementAndCount(key, windowStart) {
      const row = await db.aiRateWindow.upsert({
        where: { key_windowStart: { key, windowStart } },
        create: { key, windowStart, count: 1 },
        update: { count: { increment: 1 } },
      })
      return row.count
    },
    async reset(key) {
      await db.aiRateWindow.deleteMany({ where: { key } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const aiRateWindowRepository = createAiRateWindowRepository(prisma)
