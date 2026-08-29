import { requireAdminRole } from '~~/server/utils/requireSessionUser'
import { prisma } from '~~/server/utils/prisma'

/** Recherche globale de l'en-tête admin (#dashboard-admin) — comptes chercheurs/prestataires par nom, pseudo ou contact. */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  if (q.length < 2) return { results: [] }

  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { contact: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  return {
    results: rows.map((row) => ({
      id: row.id,
      label: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.username || row.contact,
      contact: row.contact,
      role: row.role,
    })),
  }
})
