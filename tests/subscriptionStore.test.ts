import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { conflict } from '~~/server/utils/apiError'
import {
  activateSubscription,
  activateTrialSubscription,
  createPendingSubscription,
  getSubscriptionById,
  getSubscriptionByUserId,
  isEligibleForTrial,
  TRIAL_DURATION_DAYS,
} from '~~/server/utils/subscriptionStore'

/**
 * subscriptionStore appelle le helper auto-importé `conflict` (server/utils/
 * apiError.ts), qui lui-même appelle `createError` (auto-import Nitro). Ni l'un
 * ni l'autre n'existe sous vitest : on rebranche la vraie implémentation
 * `conflict` sur globalThis, au-dessus d'un `createError` minimal qui lève une
 * erreur portant le statut — de quoi tester le chemin d'erreur 409.
 */
beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode?: number, message?: string }) =>
    Object.assign(new Error(input.message ?? 'error'), input))
  vi.stubGlobal('conflict', conflict)
})

/** Chaque test utilise un userId distinct (store indexé par userId, 1 abonnement/user). */
function userId(): string {
  return randomUUID()
}

describe('subscriptionStore (#29/#30 abonnements prestataire)', () => {
  it('createPendingSubscription crée un abonnement en attente, sans dates', () => {
    const subscription = createPendingSubscription(userId(), 'mensuel')
    expect(subscription.status).toBe('en_attente')
    expect(subscription.dateDebut).toBeNull()
    expect(subscription.dateFin).toBeNull()
  })

  it('reselectionner une formule tant que l’abonnement est en attente met à jour l’existant (même id)', () => {
    const user = userId()
    const first = createPendingSubscription(user, 'mensuel')
    const second = createPendingSubscription(user, 'trimestriel')
    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.plan).toBe('trimestriel')
    expect(getSubscriptionByUserId(user)?.plan).toBe('trimestriel')
  })

  it('createPendingSubscription refuse (409) si un abonnement actif existe déjà', () => {
    const user = userId()
    const subscription = createPendingSubscription(user, 'mensuel')
    activateSubscription(subscription.id, 30)
    expect(() => createPendingSubscription(user, 'trimestriel')).toThrow('Un abonnement actif existe déjà.')
  })

  it('getSubscriptionById retrouve un abonnement, ou null si inconnu', () => {
    const subscription = createPendingSubscription(userId(), 'mensuel')
    expect(getSubscriptionById(subscription.id)?.id).toBe(subscription.id)
    expect(getSubscriptionById('inexistant')).toBeNull()
  })

  it('activateSubscription passe l’abonnement en actif et calcule dateFin depuis la durée', () => {
    const now = 1_000_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const subscription = createPendingSubscription(userId(), 'mensuel')

    const activated = activateSubscription(subscription.id, 30)

    spy.mockRestore()
    expect(activated?.status).toBe('actif')
    expect(activated?.dateDebut).toBe(now)
    expect(activated?.dateFin).toBe(now + 30 * 24 * 60 * 60 * 1000)
  })

  it('activateSubscription renvoie null pour un identifiant inconnu', () => {
    expect(activateSubscription('inexistant', 30)).toBeNull()
  })
})

describe('essai gratuit à la première souscription (#281)', () => {
  it('un prestataire n’ayant jamais eu d’abonnement est éligible', () => {
    expect(isEligibleForTrial(userId())).toBe(true)
  })

  it('active immédiatement un abonnement, sans paiement préalable', () => {
    const now = 1_000_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    const result = activateTrialSubscription(userId(), 'mensuel')

    spy.mockRestore()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.subscription.status).toBe('actif')
      expect(result.subscription.isTrial).toBe(true)
      expect(result.subscription.dateDebut).toBe(now)
      expect(result.subscription.dateFin).toBe(now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)
    }
  })

  it('n’est plus éligible une fois l’essai consommé', () => {
    const user = userId()
    activateTrialSubscription(user, 'mensuel')
    expect(isEligibleForTrial(user)).toBe(false)
  })

  it('refuse un second essai pour le même prestataire', () => {
    const user = userId()
    activateTrialSubscription(user, 'mensuel')
    expect(activateTrialSubscription(user, 'trimestriel')).toEqual({ ok: false, error: 'already_used' })
  })

  it('refuse l’essai si un abonnement (même en attente, jamais activé) existe déjà', () => {
    const user = userId()
    createPendingSubscription(user, 'mensuel')
    expect(isEligibleForTrial(user)).toBe(false)
    expect(activateTrialSubscription(user, 'mensuel')).toEqual({ ok: false, error: 'already_used' })
  })

  it('un abonnement payé classique n’est pas marqué comme essai', () => {
    const subscription = createPendingSubscription(userId(), 'mensuel')
    const activated = activateSubscription(subscription.id, 30)
    expect(activated?.isTrial).toBe(false)
  })
})
