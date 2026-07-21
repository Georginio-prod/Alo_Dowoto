import { randomUUID } from 'node:crypto'
import type { ContournementReason } from '~~/server/utils/contournementDetector'

/**
 * Journal en mémoire des tentatives de contournement détectées et bloquées
 * dans la messagerie (#265). Conservé pour que l'équipe support puisse
 * identifier des comptes récidivistes — même limite que les autres stores
 * (pas de base de données encore en place, voir #45/#46).
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

const attempts: ContournementAttempt[] = []

const EXCERPT_MAX_LENGTH = 200

export function logContournementAttempt(input: {
  conversationId: string
  userId: string
  reason: ContournementReason
  text: string
}): ContournementAttempt {
  const attempt: ContournementAttempt = {
    id: randomUUID(),
    conversationId: input.conversationId,
    userId: input.userId,
    reason: input.reason,
    excerpt: input.text.slice(0, EXCERPT_MAX_LENGTH),
    createdAt: Date.now(),
  }
  attempts.push(attempt)
  return attempt
}

/** Tentatives les plus récentes en premier, pour une future UI support. */
export function listContournementAttempts(): ContournementAttempt[] {
  return [...attempts].sort((a, b) => b.createdAt - a.createdAt)
}

export function listContournementAttemptsForUser(userId: string): ContournementAttempt[] {
  return listContournementAttempts().filter((attempt) => attempt.userId === userId)
}
