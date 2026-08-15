import type { H3Event } from 'h3'

/**
 * Lecture des paramètres de pagination/recherche communs aux routes de liste
 * du dashboard admin (/api/admin/**). `page` commence à 1 ; `pageSize` est
 * borné à [1, 100] pour éviter qu'un client demande des pages démesurées.
 */
export interface AdminListParams {
  page: number
  pageSize: number
  skip: number
  take: number
  search: string
}

export function readAdminListParams(event: H3Event): AdminListParams {
  const q = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(q.page ?? '1'), 10) || 1)
  const rawSize = Number.parseInt(String(q.pageSize ?? '25'), 10) || 25
  const pageSize = Math.min(100, Math.max(1, rawSize))
  const search = String(q.search ?? '').trim()
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, search }
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
