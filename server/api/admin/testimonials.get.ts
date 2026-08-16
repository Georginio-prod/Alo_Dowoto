import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des témoignages RÉELS (base) pour la modération admin
 * (`testimonials.moderate`). Les avis d'exemple (SEED_TESTIMONIALS, constantes
 * de code de testimonialStore.ts) ne sont pas listés ici : ils ne sont pas
 * modérables. Recherche sur le nom et le message ; filtre `?hidden=yes|no`.
 */
export default defineEventHandler(async (event) => {
  await requireAdminPermission(event, 'testimonials.moderate')

  const params = readAdminListParams(event)
  const hiddenFilter = String(getQuery(event).hidden ?? '').trim()

  const where: Prisma.TestimonialWhereInput = {}
  if (hiddenFilter === 'yes') where.hidden = true
  else if (hiddenFilter === 'no') where.hidden = false
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { message: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: { id: true, name: true, role: true, message: true, rating: true, hidden: true, createdAt: true },
    }),
    prisma.testimonial.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    message: r.message,
    rating: r.rating,
    hidden: r.hidden,
    createdAt: r.createdAt.getTime(),
  }))

  return paginated(items, total, params)
})
