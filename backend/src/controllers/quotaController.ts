import type { Request, Response } from 'express'
import { tooManyRequests } from '../utils/apiError'
import { authUser } from '../utils/authUser'
import { subscriptionService } from '../services/subscriptionService'
import {
  CLIENT_CONTACTS_MONTHLY_LIMIT,
  getClientContactsUsage,
  getProviderRequestsUsage,
  incrementClientContacts,
} from '../services/quotaService'

/**
 * Handlers des compteurs d'usage mensuels (#65), portés iso depuis
 * `server/api/quotas/**` (ADR-0016). Contacts réservés au rôle client, demandes
 * reçues au rôle prestataire (gardes montées sur les routes).
 */

/** GET /api/quotas/contacts → { usage } (contacts du mois, sans incrément). */
export function getContacts(req: Request, res: Response): void {
  res.json({ usage: getClientContactsUsage(authUser(req).id) })
}

/**
 * POST /api/quotas/contacts → incrémente le compteur (clic « Contacter »).
 * Quota gratuit atteint (3/mois) → 429 explicite avec l'usage, jamais une 500
 * brute : le bouton « Contacter » s'en sert pour se désactiver (iso Nitro).
 */
export function postContacts(req: Request, res: Response): void {
  const userId = authUser(req).id
  const usage = getClientContactsUsage(userId)
  if (usage.count >= CLIENT_CONTACTS_MONTHLY_LIMIT) {
    tooManyRequests('Quota de contacts atteint ce mois-ci (3 / mois). Réessayez le mois prochain.', { usage })
  }
  const result = incrementClientContacts(userId)
  res.json({ usage: { ...result, limit: CLIENT_CONTACTS_MONTHLY_LIMIT } })
}

/** GET /api/quotas/requests-received → { usage } (demandes reçues du mois, selon la formule). */
export async function getRequestsReceived(req: Request, res: Response): Promise<void> {
  const userId = authUser(req).id
  const subscription = await subscriptionService.getSubscriptionByUserId(userId)
  // Un abonnement en attente ou expiré n'ouvre pas droit à un quota, au même
  // titre qu'une absence totale d'abonnement (iso Nitro).
  const plan = subscription?.status === 'actif' ? subscription.plan : null
  res.json({ usage: getProviderRequestsUsage(userId, plan) })
}
