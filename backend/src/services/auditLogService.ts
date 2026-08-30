import type { User } from '@prisma/client'
import { auditLogRepository, type AuditLogRepository, type AuditLogWhere } from '../repositories/auditLogRepository'

/**
 * Journal d'audit du dashboard admin (#dashboard-admin), porté iso depuis
 * `server/utils/auditLog.ts` (ADR-0016). Écriture **best-effort** : une panne du
 * journal ne fait jamais échouer l'action métier documentée.
 */

export interface RecordAuditLogInput {
  actor: User
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
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

export interface AuditLogListResult {
  entries: AuditLogEntry[]
  total: number
}

function actorLabel(actor: User): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim()
  return name || actor.username || actor.contact
}

export function createAuditLogService(repo: AuditLogRepository = auditLogRepository) {
  return {
    async recordAuditLog(input: RecordAuditLogInput): Promise<void> {
      try {
        await repo.create({
          actorId: input.actor.id,
          actorLabel: actorLabel(input.actor),
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        })
      } catch (error) {
        console.error('[auditLog] échec d’écriture', error)
      }
    },

    async listAuditLog(filters: AuditLogWhere, page: number, pageSize: number): Promise<AuditLogListResult> {
      const { rows, total } = await repo.list(filters, page, pageSize)
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
    },

    /** Les 10 dernières actions importantes (module Vue d'ensemble). */
    async listRecentAuditLog(limit = 10): Promise<AuditLogEntry[]> {
      const { entries } = await this.listAuditLog({}, 1, limit)
      return entries
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const auditLogService = createAuditLogService()
