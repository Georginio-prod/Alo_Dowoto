import type { ContournementAttempt as PrismaContournementAttempt } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import type { ContournementReason } from '~~/server/utils/contournementDetector'

/**
 * Journal des tentatives de contournement détectées et bloquées dans la
 * messagerie (#265), persisté en base (Prisma/SQLite, #357, ADR 0013).
 * Conservé pour que l'équipe support puisse identifier des comptes
 * récidivistes — survit désormais aux redémarrages du serveur.
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

export async function logContournementAttempt(input: {
  conversationId: string
  userId: string
  reason: ContournementReason
  text: string
}): Promise<ContournementAttempt> {
  const row = await prisma.contournementAttempt.create({
    data: {
      conversationId: input.conversationId,
      userId: input.userId,
      reason: input.reason,
      excerpt: input.text.slice(0, EXCERPT_MAX_LENGTH),
      createdAt: new Date(Date.now()),
    },
  })
  return toAttempt(row)
}

/** Tentatives les plus récentes en premier, pour une future UI support. */
export async function listContournementAttempts(): Promise<ContournementAttempt[]> {
  const rows = await prisma.contournementAttempt.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(toAttempt)
}

export async function listContournementAttemptsForUser(userId: string): Promise<ContournementAttempt[]> {
  const rows = await prisma.contournementAttempt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toAttempt)
}
