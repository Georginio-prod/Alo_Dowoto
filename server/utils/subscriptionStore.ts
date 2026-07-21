import { randomUUID } from 'node:crypto'
import type { PlanSlug } from '~~/app/data/plans'

/**
 * Store en mémoire pour les abonnements. Suffisant pour ce lot (pas de
 * base de données encore en place, voir #45/#46).
 *
 * Association 1-1 avec le compte prestataire : un seul abonnement par
 * utilisateur, indexé par userId.
 */

export type SubscriptionStatus = 'en_attente' | 'actif' | 'expire'

export interface Subscription {
  id: string
  userId: string
  plan: PlanSlug
  status: SubscriptionStatus
  dateDebut: number | null
  dateFin: number | null
  createdAt: number
  /** `true` si la période active courante est l'essai gratuit (#281), pas une période payée. */
  isTrial: boolean
}

/**
 * Durée de l'essai gratuit à la première souscription (#281), affichée
 * depuis toujours sur /abonnement (« Essai gratuit de 14 jours, sans
 * engagement ») et dans PLAN_COMPARISON — jusqu'ici sans contrepartie
 * côté serveur : un prestataire était renvoyé vers le paiement immédiat
 * malgré cette promesse.
 */
export const TRIAL_DURATION_DAYS = 14

const subscriptionsByUserId = new Map<string, Subscription>()

/**
 * Crée (ou remet en attente) l'abonnement d'un prestataire pour la formule
 * choisie. Tant qu'il n'est pas actif, resélectionner une formule met
 * simplement à jour l'abonnement existant. Un abonnement déjà actif n'est
 * jamais réécrit par ce chemin (pas de changement/downgrade de formule
 * implicite — non couvert par le prototype actuel).
 */
export function createPendingSubscription(userId: string, plan: PlanSlug): Subscription {
  const existing = subscriptionsByUserId.get(userId)
  if (existing?.status === 'actif') {
    conflict('Un abonnement actif existe déjà.')
  }

  const subscription: Subscription = {
    id: existing?.id ?? randomUUID(),
    userId,
    plan,
    status: 'en_attente',
    dateDebut: null,
    dateFin: null,
    createdAt: existing?.createdAt ?? Date.now(),
    isTrial: false,
  }
  subscriptionsByUserId.set(userId, subscription)
  return subscription
}

export type ActivateTrialResult =
  | { ok: true; subscription: Subscription }
  | { ok: false; error: 'already_used' }

/**
 * Active l'essai gratuit (#281) : réservé à un prestataire n'ayant jamais eu
 * le moindre abonnement (en attente, actif ou expiré) — l'essai ne se
 * consomme qu'une fois, jamais reconductible à chaque changement de formule.
 * Contrairement à `activateSubscription`, aucun paiement préalable requis :
 * la souscription est directement active.
 */
export function activateTrialSubscription(userId: string, plan: PlanSlug): ActivateTrialResult {
  if (subscriptionsByUserId.has(userId)) {
    return { ok: false, error: 'already_used' }
  }

  const now = Date.now()
  const subscription: Subscription = {
    id: randomUUID(),
    userId,
    plan,
    status: 'actif',
    dateDebut: now,
    dateFin: now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
    createdAt: now,
    isTrial: true,
  }
  subscriptionsByUserId.set(userId, subscription)
  return { ok: true, subscription }
}

/** Un prestataire n'ayant jamais eu d'abonnement (même abandonné en attente) reste éligible à l'essai gratuit (#281). */
export function isEligibleForTrial(userId: string): boolean {
  return !subscriptionsByUserId.has(userId)
}

export function getSubscriptionByUserId(userId: string): Subscription | null {
  return subscriptionsByUserId.get(userId) ?? null
}

export function getSubscriptionById(id: string): Subscription | null {
  for (const subscription of subscriptionsByUserId.values()) {
    if (subscription.id === id) return subscription
  }
  return null
}

/**
 * Active un abonnement en attente après confirmation du paiement (#34).
 */
export function activateSubscription(id: string, durationDays: number): Subscription | null {
  const subscription = getSubscriptionById(id)
  if (!subscription) return null

  const now = Date.now()
  subscription.status = 'actif'
  subscription.dateDebut = now
  subscription.dateFin = now + durationDays * 24 * 60 * 60 * 1000
  return subscription
}
