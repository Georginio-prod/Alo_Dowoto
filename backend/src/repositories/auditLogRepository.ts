import type { AuditLog, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données du journal d'audit admin (`prisma.auditLog`). Porté iso depuis
 * `server/utils/auditLog.ts` (ADR-0016). Client Prisma injecté. La mise en forme
 * (label d'acteur, best-effort) reste dans `auditLogService`.
 */

export interface CreateAuditLogInput {
  actorId: string
  actorLabel: string
  action: string
  targetType: string
  targetId: string | null
  metadata: string | null
}

export interface AuditLogWhere {
  targetType?: string
  targetId?: string
  query?: string
}

function buildWhere(filters: AuditLogWhere) {
  return {
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(filters.targetId ? { targetId: filters.targetId } : {}),
    ...(filters.query ? { OR: [{ action: { contains: filters.query } }, { actorLabel: { contains: filters.query } }] } : {}),
  }
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>
  list(filters: AuditLogWhere, page: number, pageSize: number): Promise<{ rows: AuditLog[]; total: number }>
}

export function createAuditLogRepository(db: PrismaClient): AuditLogRepository {
  return {
    async create(input) {
      await db.auditLog.create({ data: input })
    },
    async list(filters, page, pageSize) {
      const where = buildWhere(filters)
      const [rows, total] = await Promise.all([
        db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        db.auditLog.count({ where }),
      ])
      return { rows, total }
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const auditLogRepository = createAuditLogRepository(prisma)
