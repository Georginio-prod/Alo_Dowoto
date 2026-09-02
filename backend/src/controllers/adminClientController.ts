import type { Request, Response } from 'express'
import { badRequest, notFound } from '../utils/apiError'
import { parseAdminPagination, readAdminQueryString } from '../utils/adminList'
import { getAdminClientDetail, listAdminClients, type AdminClientFilters } from '../services/adminClientService'

/**
 * Dashboard admin (#admin) — module 3 : comptes chercheur. Portées iso depuis
 * `server/api/admin/clients/**` (ADR-0017) : liste paginée filtrable et fiche
 * détaillée (demandes, missions payées, litiges, remboursements, avis déposés).
 */

/** GET /api/admin/clients — liste paginée et filtrable des chercheurs (rôle admin). */
export async function adminListClients(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = parseAdminPagination(req.query)
  const status = readAdminQueryString(req, 'status')
  const risk = readAdminQueryString(req, 'risk')
  const q = readAdminQueryString(req, 'q')

  const filters: AdminClientFilters = {
    status: status === 'active' || status === 'suspended' ? status : undefined,
    riskFlag: risk === '1' ? true : undefined,
    query: q || undefined,
  }

  const result = await listAdminClients(filters, page, pageSize)
  res.json({ ...result, page, pageSize })
}

/** GET /api/admin/clients/:id — fiche détaillée d'un chercheur (rôle admin). */
export async function adminClientDetail(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant requis.')

  const detail = await getAdminClientDetail(id)
  if (!detail) notFound('Chercheur introuvable.')
  res.json({ client: detail })
}
