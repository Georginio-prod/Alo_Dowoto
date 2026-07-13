import { SECTORS } from '~~/app/data/sectors'
import type { PayoutMethod } from '~~/server/utils/providerStore'

interface PatchProviderBody {
  sector?: string
  city?: string
  payoutMethod?: PayoutMethod
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

  // Localisation et mode de rémunération obligatoires dès l'inscription
  // (#124) : le serveur ne fait pas confiance à la validation front.
  const requiredFields = resolveRequiredOnboardingFields(body ?? {}, existing)
  if (!requiredFields.ok) {
    badRequest(requiredFields.error)
  }

  const profile = upsertProviderProfile(user.id, {
    sector,
    city: requiredFields.city,
    payoutMethod: requiredFields.payoutMethod,
    photoUrl: body?.photoUrl,
    description: body?.description,
    rateFrom: body?.rateFrom,
  })

  return { profile }
})
