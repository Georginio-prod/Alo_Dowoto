import type { Subscription as PrismaSubscription } from '@prisma/client'
import { conflict } from '../utils/apiError'
import { subscriptionRepository, type SubscriptionRepository } from '../repositories/subscriptionRepository'
import type { PlanSlug } from '../data/plans'

/**
 * Abonnements prestataire (#281). Logique **portée iso** depuis
 * `server/utils/subscriptionStore.ts` (ADR-0016) : conflit si un abonnement
 * actif existe déjà, essai gratuit réservé à la toute première souscription.
 */
export type SubscriptionStatus = 'en_attente' | 'actif' | 'expire'
export const TRIAL_DURATION_DAYS = 14

export interface Subscription {
  id: string
  userId: string
  plan: PlanSlug
  status: SubscriptionStatus
  dateDebut: number | null
  dateFin: number | null
  createdAt: number
  isTrial: boolean
}

function toSubscription(row: PrismaSubscription): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    plan: row.plan as PlanSlug,
    status: row.status as SubscriptionStatus,
    dateDebut: row.dateDebut?.getTime() ?? null,
    dateFin: row.dateFin?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    isTrial: row.isTrial,
  }
}

export type ActivateTrialResult =
  | { ok: true; subscription: Subscription }
  | { ok: false; error: 'already_used' }

export function createSubscriptionService(repo: SubscriptionRepository = subscriptionRepository) {
  return {
    async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
      const row = await repo.findByUserId(userId)
      return row ? toSubscription(row) : null
    },

    /** Crée (ou remet en attente) l'abonnement ; 409 si un actif existe déjà. */
    async createPendingSubscription(userId: string, plan: PlanSlug): Promise<Subscription> {
      const existing = await repo.findByUserId(userId)
      if (existing?.status === 'actif') {
        conflict('Un abonnement actif existe déjà.')
      }
      const row = existing
        ? await repo.update(existing.id, { plan, status: 'en_attente', dateDebut: null, dateFin: null, isTrial: false })
        : await repo.create({ userId, plan, status: 'en_attente' })
      return toSubscription(row)
    },

    /** Active l'essai gratuit de 14 jours — refusé si un abonnement existe déjà. */
    async activateTrialSubscription(userId: string, plan: PlanSlug): Promise<ActivateTrialResult> {
      const existing = await repo.findByUserId(userId)
      if (existing) return { ok: false, error: 'already_used' }

      const now = Date.now()
      const row = await repo.create({
        userId,
        plan,
        status: 'actif',
        dateDebut: new Date(now),
        dateFin: new Date(now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000),
        isTrial: true,
      })
      return { ok: true, subscription: toSubscription(row) }
    },
  }
}

/** Instance par défaut, liée au repository partagé. */
export const subscriptionService = createSubscriptionService()
