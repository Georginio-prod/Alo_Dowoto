import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { conflict } from '~~/server/utils/apiError'
import {
  activateSubscription,
  createPendingSubscription,
  getSubscriptionById,
  getSubscriptionByUserId,
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
