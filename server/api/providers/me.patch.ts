import { SECTORS } from '~~/app/data/sectors'

interface PatchProviderBody {
  sector?: string
  photoUrl?: string
  description?: string
  rateFrom?: number
}

const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))

export default defineEventHandler(async (event) => {
  const user = requireProviderRole(event)

  const body = await readBody<PatchProviderBody>(event)
  const existing = getProviderProfile(user.id)
  const sector = body?.sector ?? existing?.sector

  if (!sector || !VALID_SECTOR_SLUGS.has(sector)) {
    badRequest('Secteur invalide.')
  }
  if (body?.rateFrom !== undefined && (typeof body.rateFrom !== 'number' || body.rateFrom < 0)) {
    badRequest('Tarif invalide.')
  }

  const profile = upsertProviderProfile(user.id, {
    sector,
    photoUrl: body?.photoUrl,
    description: body?.description,
    rateFrom: body?.rateFrom,
  })

  return { profile }
})
