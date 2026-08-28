import type { Request, Response } from 'express'
import { badRequest, notFound } from '../utils/apiError'
import { providerProfileService, resolveRequiredOnboardingFields } from '../services/providerProfileService'
import type { PatchProviderInput } from '../validation/schemas/providers'

/**
 * Handlers du profil prestataire (#124/#263/#356). Portés iso depuis
 * `server/api/providers/me*` (ADR-0016). Réservés au **rôle prestataire**
 * (`requireProviderRole` monté sur les routes).
 */

/** GET /api/providers/me → { profile } (ou null). */
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  res.json({ profile: await providerProfileService.getProviderProfile(req.user!.id) })
}

/** PATCH /api/providers/me → { profile }. Secteur/onboarding obligatoires validés ici. */
export async function patchMyProfile(req: Request, res: Response): Promise<void> {
  const user = req.user!
  const body = req.body as PatchProviderInput

  const existing = await providerProfileService.getProviderProfile(user.id)
  const sector = body.sector ?? existing?.sector
  if (!sector) badRequest('Secteur invalide.')

  const requiredFields = resolveRequiredOnboardingFields(body, existing)
  if (!requiredFields.ok) badRequest(requiredFields.error)

  // Recalculé à chaque enregistrement depuis l'identité (un changement de
  // nom/pseudo se répercute en recherche publique). Iso `providers/me.patch.ts`.
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'Prestataire WorkTogo'

  const profile = await providerProfileService.upsertProviderProfile(user.id, {
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

  res.json({ profile })
}

/** DELETE /api/providers/me/position → { profile } (404 si pas de profil). */
export async function deleteMyPosition(req: Request, res: Response): Promise<void> {
  const updated = await providerProfileService.clearProviderPosition(req.user!.id)
  if (!updated) notFound('Profil prestataire introuvable.')
  res.json({ profile: updated })
}
