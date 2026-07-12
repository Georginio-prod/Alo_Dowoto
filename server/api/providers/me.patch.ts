import { SECTORS } from '~~/app/data/sectors'

interface PatchProviderBody {
  sector?: string
  photoUrl?: string
  description?: string
  rateFrom?: number
}

const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))

export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)
  if (user.role !== 'prestataire') {
    throw createError({ statusCode: 403, statusMessage: 'Réservé aux comptes prestataire.' })
  }

  const body = await readBody<PatchProviderBody>(event)
  const existing = getProviderProfile(user.id)
  const sector = body?.sector ?? existing?.sector

  if (!sector || !VALID_SECTOR_SLUGS.has(sector)) {
    throw createError({ statusCode: 400, statusMessage: 'Secteur invalide.' })
  }
  if (body?.rateFrom !== undefined && (typeof body.rateFrom !== 'number' || body.rateFrom < 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Tarif invalide.' })
  }

  const profile = upsertProviderProfile(user.id, {
    sector,
    photoUrl: body?.photoUrl,
    description: body?.description,
    rateFrom: body?.rateFrom,
  })

  return { profile }
})
