import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { WEBHOOK_REPLAY_WINDOW_MS } from '../utils/webhookSignature'

/**
 * Anti-rejeu des webhooks (#355) — nonces consommés (`prisma.webhookNonce`).
 * Porté iso depuis `server/utils/webhookSignature.ts#consumeWebhookNonce`
 * (ADR-0016), déjà persisté en base (ADR-0013). La détection de rejeu repose sur
 * la contrainte d'unicité de la clé primaire : réinsérer un nonce échoue (P2002)
 * → c'est un rejeu. Atomique et sûr en multi-process. Client Prisma injecté.
 */
export interface WebhookNonceRepository {
  /** Marque le nonce comme consommé et indique s'il l'était déjà (rejeu). */
  consume(nonce: string): Promise<boolean>
}

export function createWebhookNonceRepository(db: PrismaClient): WebhookNonceRepository {
  return {
    async consume(nonce) {
      const now = Date.now()
      // Purge des nonces périmés (housekeeping borné par la fenêtre de rejeu).
      await db.webhookNonce.deleteMany({ where: { expiresAt: { lte: new Date(now) } } })
      try {
        await db.webhookNonce.create({ data: { nonce, expiresAt: new Date(now + WEBHOOK_REPLAY_WINDOW_MS) } })
        return false
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return true
        throw error
      }
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const webhookNonceRepository = createWebhookNonceRepository(prisma)
