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
}

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
    throw createError({ statusCode: 409, statusMessage: 'Un abonnement actif existe déjà.' })
  }

  const subscription: Subscription = {
    id: existing?.id ?? randomUUID(),
    userId,
    plan,
    status: 'en_attente',
    dateDebut: null,
    dateFin: null,
    createdAt: existing?.createdAt ?? Date.now(),
  }
  subscriptionsByUserId.set(userId, subscription)
  return subscription
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
