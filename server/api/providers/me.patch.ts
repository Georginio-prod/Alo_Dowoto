export default defineEventHandler(async (event) => {
  const user = await requireProviderRole(event)

  const body = await readSchemaBody(event, patchProviderSchema)
  const existing = getProviderProfile(user.id)
  const sector = body.sector ?? existing?.sector

  if (!sector) {
    badRequest('Secteur invalide.')
  }

  // Localisation et mode de rémunération obligatoires dès l'inscription
  // (#124) : le serveur ne fait pas confiance à la validation front.
  const requiredFields = resolveRequiredOnboardingFields(body, existing)
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
    latitude: body.latitude,
    longitude: body.longitude,
    quartier: body.quartier,
    adresse: body.adresse?.trim(),
    pointsDeRepere: body.pointsDeRepere?.trim(),
    rayonInterventionKm: body.rayonInterventionKm,
    positionApproximative: body.positionApproximative,
    payoutMethod: requiredFields.payoutMethod,
    photoUrl: body.photoUrl,
    description: body.description,
    rateFrom: body.rateFrom,
    rateTo: body.rateTo,
    mobility: body.mobility,
    availability: body.availability?.trim(),
    cvUrl: body.cvUrl,
    cvFileName: body.cvFileName,
    languages: body.languages,
    formations: body.formations,
    certifications: body.certifications,
    whatsapp: body.whatsapp?.trim(),
    website: body.website?.trim(),
  })

  return { profile }
})
