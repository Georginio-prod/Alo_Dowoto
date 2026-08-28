import type { Request, Response } from 'express'
import { badRequest, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { availabilityService } from '../services/availabilityService'
import type { AddAvailabilityInput } from '../validation/schemas/providers'

/**
 * Handlers du calendrier de disponibilité prestataire (#290). Portés iso depuis
 * `server/api/providers/availability*` (ADR-0016). Réservés au **rôle
 * prestataire** (`requireProviderRole` monté sur les routes).
 */

/** GET /api/providers/availability → { periods }. */
export async function listAvailability(req: Request, res: Response): Promise<void> {
  res.json({ periods: await availabilityService.listUnavailabilityPeriods(authUser(req).id) })
}

/** POST /api/providers/availability → 201 { period } (400 si dates invalides). */
export async function addAvailability(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.body as AddAvailabilityInput
  const result = await availabilityService.addUnavailabilityPeriod(authUser(req).id, startDate, endDate)
  if (!result.ok) {
    if (result.error === 'invalid_date') badRequest('Format de date invalide (attendu : AAAA-MM-JJ).')
    badRequest('La date de fin doit être postérieure ou égale à la date de début.')
  }
  res.status(201).json({ period: result.period })
}

/** DELETE /api/providers/availability/:id → { ok: true } (404 si inconnue). */
export async function deleteAvailability(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id) badRequest('Identifiant de période manquant.')
  const removed = await availabilityService.removeUnavailabilityPeriod(authUser(req).id, id)
  if (!removed) notFound("Aucune période d'indisponibilité trouvée avec cet identifiant.")
  res.json({ ok: true })
}
