import type { Request, Response } from 'express'
import { auditLogService } from '../services/auditLogService'
import { parseAdminPagination, readAdminQueryString } from '../utils/adminList'

/**
 * Dashboard admin (#admin) — module 12 : journal d'audit. Porté iso depuis
 * `server/api/admin/audit-log/index.get.ts` (ADR-0017). Journal horodaté de
 * toutes les actions sensibles, paginé et filtrable (type de cible, recherche
 * texte sur l'action ou l'acteur).
 */

/** GET /api/admin/audit-log — journal d'audit paginé et filtrable (rôle admin). */
export async function adminAuditLog(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = parseAdminPagination(req.query)

  const targetType = readAdminQueryString(req, 'targetType')
  const query = readAdminQueryString(req, 'q')

  const result = await auditLogService.listAuditLog(
    { targetType: targetType || undefined, query: query || undefined },
    page,
    pageSize,
  )
  res.json({ ...result, page, pageSize })
}
