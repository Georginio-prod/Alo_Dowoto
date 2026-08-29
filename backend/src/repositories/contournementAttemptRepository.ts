import type { ContournementAttempt as PrismaContournementAttempt, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'
import type { ContournementReason } from '../utils/contournementDetector'

/**
 * Journal des tentatives de contournement détectées et bloquées dans la
 * messagerie (#265). Porté iso depuis `server/utils/contournementAttemptStore.ts`
 * (ADR-0016), déjà persisté en base (ADR-0013). Client Prisma injecté.
 */
export interface ContournementAttempt {
  id: string
  conversationId: string
  userId: string
  reason: ContournementReason
  /** Extrait tronqué du message bloqué, à des fins d'audit — pas le message intégral. */
  excerpt: string
  createdAt: number
}

const EXCERPT_MAX_LENGTH = 200

function toAttempt(row: PrismaContournementAttempt): ContournementAttempt {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    reason: row.reason as ContournementReason,
    excerpt: row.excerpt,
    createdAt: row.createdAt.getTime(),
  }
}

export interface LogContournementAttemptInput {
  conversationId: string
  userId: string
  reason: ContournementReason
  text: string
}

export interface ContournementAttemptRepository {
  log(input: LogContournementAttemptInput): Promise<ContournementAttempt>
  listAll(): Promise<ContournementAttempt[]>
  listForUser(userId: string): Promise<ContournementAttempt[]>
}

export function createContournementAttemptRepository(db: PrismaClient): ContournementAttemptRepository {
  return {
    async log(input) {
      const row = await db.contournementAttempt.create({
        data: {
          conversationId: input.conversationId,
          userId: input.userId,
          reason: input.reason,
          excerpt: input.text.slice(0, EXCERPT_MAX_LENGTH),
          createdAt: new Date(Date.now()),
        },
      })
      return toAttempt(row)
    },
    async listAll() {
      const rows = await db.contournementAttempt.findMany({ orderBy: { createdAt: 'desc' } })
      return rows.map(toAttempt)
    },
    async listForUser(userId) {
      const rows = await db.contournementAttempt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
      return rows.map(toAttempt)
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const contournementAttemptRepository = createContournementAttemptRepository(prisma)
