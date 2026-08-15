import type { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Liste paginée des profils prestataires pour le dashboard admin, avec le
 * secteur et le compte associés. Recherche sur le nom affiché et la ville ;
 * filtre optionnel ?verified=true|false.
 */
export default defineEventHandler(async (event) => {
  await requireAdminRole(event)

  const params = readAdminListParams(event)
  const verified = String(getQuery(event).verified ?? '').trim()

  const where: Prisma.ProviderProfileWhereInput = {}
  if (verified === 'true') where.verified = true
  if (verified === 'false') where.verified = false
  if (params.search) {
    where.OR = [
      { displayName: { contains: params.search } },
      { city: { contains: params.search } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        displayName: true,
        city: true,
        verified: true,
        ratingAverage: true,
        reviewCount: true,
        rateFrom: true,
        updatedAt: true,
        sector: { select: { name: true, emoji: true } },
        user: { select: { contact: true, firstName: true, lastName: true } },
      },
    }),
    prisma.providerProfile.count({ where }),
  ])

  const items = rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    city: r.city,
    verified: r.verified,
    ratingAverage: r.ratingAverage,
    reviewCount: r.reviewCount,
    rateFrom: r.rateFrom,
    updatedAt: r.updatedAt.getTime(),
    sector: r.sector ? `${r.sector.emoji} ${r.sector.name}` : null,
    contact: r.user?.contact ?? null,
    fullName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
  }))

  return paginated(items, total, params)
})
