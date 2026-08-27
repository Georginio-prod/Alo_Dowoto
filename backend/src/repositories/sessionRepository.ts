import type { PrismaClient, Session, User } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Couche **repository** : le seul endroit qui parle à Prisma pour un domaine
 * donné (ici les sessions). C'est le patron de référence pour la Phase 2 —
 * chaque domaine porté depuis `server/utils/*Store.ts` expose un repository de
 * ce type, et les `services/` composent les repositories sans jamais toucher
 * Prisma en direct.
 *
 * Deux propriétés le rendent **découplé de Nitro** (ADR-0015) :
 *   - **client injecté** : la fabrique reçoit le `PrismaClient`, donc le
 *     repository est testable sans base réelle (client factice) et sans
 *     auto-import Nitro ;
 *   - **aucune erreur framework** : il ne lève ni `createError` h3 ni
 *     `HttpError` — l'accès aux données renvoie des valeurs neutres ; la
 *     traduction en erreurs HTTP appartient aux services/routes.
 */
export interface SessionRepository {
  /** Session + utilisateur associé, ou `null` si le jeton est inconnu. */
  findByToken(token: string): Promise<(Session & { user: User }) | null>
  /** Supprime une session (au mieux : une absence n'est pas une erreur). */
  deleteByToken(token: string): Promise<void>
}

export function createSessionRepository(db: PrismaClient): SessionRepository {
  return {
    findByToken(token) {
      return db.session.findUnique({ where: { token }, include: { user: true } })
    },
    async deleteByToken(token) {
      await db.session.delete({ where: { token } }).catch(() => undefined)
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const sessionRepository = createSessionRepository(prisma)
