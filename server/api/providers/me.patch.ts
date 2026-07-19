import { SECTORS } from '~~/app/data/sectors'
import { MOBILITY_OPTIONS } from '~~/server/utils/providerStore'
import type { CertificationEntry, FormationEntry, Mobility, PayoutMethod } from '~~/server/utils/providerStore'

interface PatchProviderBody {
  sector?: string
  city?: string
  payoutMethod?: PayoutMethod
  photoUrl?: string
  description?: string
  rateFrom?: number
  rateTo?: number
  mobility?: Mobility
  availability?: string
  cvUrl?: string | null
  cvFileName?: string | null
  languages?: string[]
  formations?: FormationEntry[]
  certifications?: CertificationEntry[]
  whatsapp?: string
  website?: string
}

const VALID_SECTOR_SLUGS = new Set(SECTORS.map((sector) => sector.slug))
const MAX_LANGUAGES = 12
const MAX_FORMATIONS = 15
const MAX_CERTIFICATIONS = 15

export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)

  const body = await readBody<PatchProviderBody>(event)
  const existing = getProviderProfile(user.id)
  const sector = body?.sector ?? existing?.sector

  if (!sector || !VALID_SECTOR_SLUGS.has(sector)) {
    badRequest('Secteur invalide.')
  }
  if (body?.rateFrom !== undefined && (typeof body.rateFrom !== 'number' || body.rateFrom < 0)) {
    badRequest('Tarif invalide.')
  }
  if (body?.rateTo !== undefined && (typeof body.rateTo !== 'number' || body.rateTo < 0)) {
    badRequest('Tarif invalide.')
  }
  if (body?.rateFrom !== undefined && body?.rateTo !== undefined && body.rateTo < body.rateFrom) {
    badRequest('Le tarif maximum doit être supérieur ou égal au tarif minimum.')
  }
  if (body?.mobility !== undefined && !MOBILITY_OPTIONS.includes(body.mobility)) {
    badRequest('Préférence de déplacement invalide.')
  }
  if (body?.languages !== undefined) {
    if (!Array.isArray(body.languages) || body.languages.length > MAX_LANGUAGES || body.languages.some((lang) => typeof lang !== 'string' || !lang.trim())) {
      badRequest('Liste de langues invalide.')
    }
  }
  if (body?.formations !== undefined) {
    if (!Array.isArray(body.formations) || body.formations.length > MAX_FORMATIONS || body.formations.some((f) => !f?.title?.trim())) {
      badRequest('Liste de formations invalide.')
    }
  }
  if (body?.certifications !== undefined) {
    if (
      !Array.isArray(body.certifications)
      || body.certifications.length > MAX_CERTIFICATIONS
      || body.certifications.some((c) => !c?.title?.trim() || !c?.fileUrl)
    ) {
      badRequest('Liste de certifications invalide.')
    }
  }

  // Localisation et mode de rémunération obligatoires dès l'inscription
  // (#124) : le serveur ne fait pas confiance à la validation front.
  const requiredFields = resolveRequiredOnboardingFields(body ?? {}, existing)
  if (!requiredFields.ok) {
    badRequest(requiredFields.error)
  }

  // Recalculé à chaque enregistrement plutôt que figé à l'inscription : un
  // changement de nom/pseudo (/profil/identite) se répercute immédiatement
  // sur la fiche visible en recherche publique (#hub-profil-prestataire).
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'Prestataire WorkTogo'

  const profile = upsertProviderProfile(user.id, {
    displayName,
    sector,
    city: requiredFields.city,
    payoutMethod: requiredFields.payoutMethod,
    photoUrl: body?.photoUrl,
    description: body?.description,
    rateFrom: body?.rateFrom,
    rateTo: body?.rateTo,
    mobility: body?.mobility,
    availability: body?.availability?.trim(),
    cvUrl: body?.cvUrl,
    cvFileName: body?.cvFileName,
    languages: body?.languages?.map((lang) => lang.trim()),
    formations: body?.formations,
    certifications: body?.certifications,
    whatsapp: body?.whatsapp?.trim(),
    website: body?.website?.trim(),
  })

  return { profile }
})
