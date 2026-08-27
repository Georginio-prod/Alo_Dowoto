import type { Request, Response } from 'express'
import { badRequest, conflict } from '../utils/apiError'
import { subscriptionService } from '../services/subscriptionService'
import { findPlan } from '../data/plans'
import type { PlanSlugInput } from '../validation/schemas/subscriptions'

/**
 * Handlers des abonnements (#281). Portés iso depuis `server/api/subscriptions/*`
 * (ADR-0016). Réservés au **rôle prestataire** (`requireProviderRole` monté sur
 * les routes). Corps validé par `planSlugSchema` en amont ; `findPlan` valide la
 * formule réelle ici (400 « Formule invalide. » sinon).
 */

/** POST /api/subscriptions → { subscription } (en attente de paiement ; 409 si actif existant). */
export async function createSubscription(req: Request, res: Response): Promise<void> {
  const plan = findPlan((req.body as PlanSlugInput).plan)
  if (!plan) badRequest('Formule invalide.')
  const subscription = await subscriptionService.createPendingSubscription(req.user!.id, plan)
  res.json({ subscription })
}

/** GET /api/subscriptions/me → { subscription } (ou null). */
export async function getMySubscription(req: Request, res: Response): Promise<void> {
  res.json({ subscription: await subscriptionService.getSubscriptionByUserId(req.user!.id) })
}

/** POST /api/subscriptions/trial → 201 { subscription } (essai gratuit ; 409 si déjà souscrit). */
export async function startTrial(req: Request, res: Response): Promise<void> {
  const plan = findPlan((req.body as PlanSlugInput).plan)
  if (!plan) badRequest('Formule invalide.')
  const result = await subscriptionService.activateTrialSubscription(req.user!.id, plan)
  if (!result.ok) conflict("L'essai gratuit n'est disponible qu'à la première souscription.")
  res.status(201).json({ subscription: result.subscription })
}
