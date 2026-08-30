import type { Request } from 'express'

/**
 * Lecture des paramètres de pagination/recherche communs aux routes de liste
 * du dashboard admin (/api/admin/**). Porté iso depuis `server/utils/adminList.ts`
 * (ADR-0016) — `getQuery(event)` devient `req.query`. `page` commence à 1 ;
 * `pageSize` est borné à [1, 100] pour éviter qu'un client demande des pages
 * démesurées.
 */
export interface AdminListParams {
  page: number
  pageSize: number
  skip: number
  take: number
  search: string
}

/** Première valeur d'un paramètre de requête, en chaîne (ignore les tableaux répétés). */
function queryString(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

export function readAdminListParams(req: Request): AdminListParams {
  const q = req.query
  const page = Math.max(1, Number.parseInt(queryString(q.page) || '1', 10) || 1)
  const rawSize = Number.parseInt(queryString(q.pageSize) || '25', 10) || 25
  const pageSize = Math.min(100, Math.max(1, rawSize))
  const search = queryString(q.search).trim()
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, search }
}

/** Valeur d'un paramètre de requête admin, en chaîne émondée. Iso `String(getQuery(event).x ?? '').trim()`. */
export function readAdminQueryString(req: Request, key: string): string {
  return queryString(req.query[key]).trim()
}

export const ADMIN_DEFAULT_PAGE_SIZE = 20
export const ADMIN_MAX_PAGE_SIZE = 100

/**
 * Pagination des tableaux du dashboard web (#dashboard-admin), portée iso depuis
 * `server/utils/adminPagination.ts` — `page`/`pageSize` bornés, défauts (1, 20).
 */
export function parseAdminPagination(query: Request['query']): { page: number; pageSize: number } {
  const rawPage = Number(queryString(query.page))
  const rawPageSize = Number(queryString(query.pageSize))
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = Number.isInteger(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, ADMIN_MAX_PAGE_SIZE) : ADMIN_DEFAULT_PAGE_SIZE
  return { page, pageSize }
}

/** Enveloppe de réponse paginée standard des listes admin. */
export function paginated<T>(items: T[], total: number, params: AdminListParams) {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  }
}
