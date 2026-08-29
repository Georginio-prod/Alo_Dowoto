import { prisma } from '~~/server/utils/prisma'
import type { User } from '~~/server/utils/userStore'

/**
 * Journal d'audit du dashboard admin (#dashboard-admin, module Paramètres) :
 * chaque action sensible effectuée depuis /admin est tracée (qui, quoi,
 * quand, sur quelle ressource) — voir AuditLog dans prisma/schema.prisma.
 * Écriture best-effort : une panne du journal ne doit jamais faire échouer
 * l'action métier qu'il documente.
 */

export interface RecordAuditLogInput {
  actor: User
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
}

function actorLabel(actor: User): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim()
  return name || actor.username || actor.contact
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor.id,
        actorLabel: actorLabel(input.actor),
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    })
  } catch (error) {
    console.error('[auditLog] échec d’écriture', error)
  }
}

export interface AuditLogEntry {
  id: string
  actorId: string
  actorLabel: string
  action: string
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
}

export interface AuditLogFilters {
  targetType?: string
  targetId?: string
  query?: string
}

export interface AuditLogListResult {
  entries: AuditLogEntry[]
  total: number
}

export async function listAuditLog(filters: AuditLogFilters, page: number, pageSize: number): Promise<AuditLogListResult> {
  const where = {
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(filters.targetId ? { targetId: filters.targetId } : {}),
    ...(filters.query
      ? { OR: [{ action: { contains: filters.query, mode: 'insensitive' as const } }, { actorLabel: { contains: filters.query, mode: 'insensitive' as const } }] }
      : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
  ])
  return {
    entries: rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorLabel: row.actorLabel,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
      createdAt: row.createdAt.getTime(),
    })),
    total,
  }
}

/** Les 10 dernières actions importantes (#dashboard-admin, module Vue d'ensemble). */
export async function listRecentAuditLog(limit = 10): Promise<AuditLogEntry[]> {
  const { entries } = await listAuditLog({}, 1, limit)
  return entries
}
