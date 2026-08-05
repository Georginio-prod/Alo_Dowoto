/**
 * Pagination côté serveur commune aux tableaux admin (#dashboard-admin) —
 * aucun tableau du dashboard ne charge sa table en entier, voir
 * server/api/providers/search.get.ts pour le seul autre exemple existant.
 */

export const ADMIN_DEFAULT_PAGE_SIZE = 20
export const ADMIN_MAX_PAGE_SIZE = 100

export function parseAdminPagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  const rawPage = Number(query.page)
  const rawPageSize = Number(query.pageSize)
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = Number.isInteger(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, ADMIN_MAX_PAGE_SIZE) : ADMIN_DEFAULT_PAGE_SIZE
  return { page, pageSize }
}
