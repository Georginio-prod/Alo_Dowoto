import type { Request, Response } from 'express'
import type { z } from 'zod'
import { forbidden, notFound } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { verificationService } from '../services/verificationService'
import {
  computeMatches,
  createServiceRequest,
  getServiceRequest,
  getStoredMatches,
  listRequestsByUser,
  listRequestsForProvider,
} from '../services/requestService'
import type { createServiceRequestSchema } from '../validation/schemas/requests'

/**
 * Handlers des demandes de service (#43/#56/#63/#64), portés iso depuis
 * `server/api/requests/**` (ADR-0016). Le top de correspondances est figé à la
 * création ; `:id/matches` le recalcule à la demande sans réincrémenter les
 * quotas.
 */

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

/**
 * POST /api/requests → publie une demande (client vérifié) et renvoie son top
 * de correspondances figé. 403 si non-client ou identité non vérifiée.
 */
export async function postRequest(req: Request, res: Response): Promise<void> {
  const user = authUser(req)
  if (user.role !== 'client') forbidden('Réservé aux comptes client.')
  if (!(await verificationService.isVerified(user.id))) {
    forbidden("Vérifiez votre identité avant de publier votre première demande (carte d'identité + photo passeport).")
  }

  const body = req.body as z.infer<typeof createServiceRequestSchema>
  const request = await createServiceRequest(user.id, {
    title: body.title,
    skills: body.skills,
    description: body.description,
    budgetMax: body.budgetMax,
    urgency: body.urgency,
    location: body.location,
    sector: body.sector,
  })

  res.status(201).json({ request, matches: getStoredMatches(request.id) ?? [] })
}

/** GET /api/requests → demandes du client connecté (« Mon espace », #64). */
export function getMyRequests(req: Request, res: Response): void {
  res.json({ requests: listRequestsByUser(authUser(req).id) })
}

/** GET /api/requests/:id → demande + top figé (titulaire uniquement). */
export function getRequest(req: Request, res: Response): void {
  const user = authUser(req)
  const request = req.params.id ? getServiceRequest(req.params.id) : null
  if (!request || request.userId !== user.id) notFound('Demande introuvable.')
  res.json({ request, matches: getStoredMatches(request.id) ?? [] })
}

/** GET /api/requests/:id/matches → recalcule le top à la demande (sans incrément quota). */
export async function getRequestMatches(req: Request, res: Response): Promise<void> {
  const user = authUser(req)
  const request = req.params.id ? getServiceRequest(req.params.id) : null
  if (!request || request.userId !== user.id) notFound('Demande introuvable.')

  const rawLimit = req.query.limit
  const parsedLimit = typeof rawLimit === 'string' ? Number(rawLimit) : NaN
  const limit = Number.isFinite(parsedLimit) ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit))) : DEFAULT_LIMIT

  res.json({ matches: await computeMatches(request, limit) })
}

/** GET /api/requests/received → demandes matchées reçues par le prestataire connecté. */
export function getReceivedRequests(req: Request, res: Response): void {
  res.json({ matches: listRequestsForProvider(authUser(req).id) })
}
