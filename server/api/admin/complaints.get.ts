import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des réclamations déposées depuis /reclamation, pour le
 * support via le dashboard admin. Recherche sur le sujet, le message et
 * l'email de contact ; filtre optionnel ?category=.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const params = readAdminListParams(event)
  const category = String(getQuery(event).category ?? '').trim()
  const status = String(getQuery(event).status ?? '').trim()

  const where: Prisma.ComplaintWhereInput = {}
  if (category) where.category = category
  if (status === 'nouveau' || status === 'en_cours' || status === 'resolu') where.status = status
  if (params.search) {
    where.OR = [
      { subject: { contains: params.search } },
      { message: { contains: params.search } },
      { contactEmail: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        category: true,
        subject: true,
        message: true,
        contactEmail: true,
        userId: true,
        createdAt: true,
        status: true,
        adminNote: true,
        handledAt: true,
      },
    }),
    prisma.complaint.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    subject: r.subject,
    message: r.message,
    contactEmail: r.contactEmail,
    userId: r.userId,
    createdAt: r.createdAt.getTime(),
    status: r.status,
    adminNote: r.adminNote,
    handledAt: r.handledAt?.getTime() ?? null,
  }))

  return paginated(items, total, params)
})
