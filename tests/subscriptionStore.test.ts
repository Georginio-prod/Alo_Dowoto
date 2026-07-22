import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { conflict } from '~~/server/utils/apiError'
import { findOrCreateUser, type NewUserProfile } from '~~/server/utils/userStore'
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

const PROFILE: NewUserProfile = {
  username: 'sub-test',
  firstName: 'Sub',
  lastName: 'Test',
  location: 'Lomé',
}

/**
 * Depuis la bascule sur Prisma (#342, ADR 0013), un abonnement référence un
 * vrai compte (clé étrangère `Subscription.userId → User`). Chaque test crée
 * donc un utilisateur réel et distinct, comme en production.
 */
let counter = 0
async function providerUserId(): Promise<string> {
  counter += 1
  const contact = `+228${Date.now()}${counter}`
  const { user } = await findOrCreateUser(contact, 'prestataire', PROFILE)
  return user.id
}

describe('subscriptionStore (#29/#30 abonnements prestataire)', () => {
  it('createPendingSubscription crée un abonnement en attente, sans dates', async () => {
    const subscription = await createPendingSubscription(await providerUserId(), 'mensuel')
    expect(subscription.status).toBe('en_attente')
    expect(subscription.dateDebut).toBeNull()
    expect(subscription.dateFin).toBeNull()
  })

  it('reselectionner une formule tant que l’abonnement est en attente met à jour l’existant (même id)', async () => {
    const user = await providerUserId()
    const first = await createPendingSubscription(user, 'mensuel')
    const second = await createPendingSubscription(user, 'trimestriel')
    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.plan).toBe('trimestriel')
    expect((await getSubscriptionByUserId(user))?.plan).toBe('trimestriel')
  })

  it('createPendingSubscription refuse (409) si un abonnement actif existe déjà', async () => {
    const user = await providerUserId()
    const subscription = await createPendingSubscription(user, 'mensuel')
    await activateSubscription(subscription.id, 30)
    await expect(createPendingSubscription(user, 'trimestriel')).rejects.toThrow('Un abonnement actif existe déjà.')
  })

  it('getSubscriptionById retrouve un abonnement, ou null si inconnu', async () => {
    const subscription = await createPendingSubscription(await providerUserId(), 'mensuel')
    expect((await getSubscriptionById(subscription.id))?.id).toBe(subscription.id)
    expect(await getSubscriptionById(randomUUID())).toBeNull()
  })

  it('activateSubscription passe l’abonnement en actif et calcule dateFin depuis la durée', async () => {
    const user = await providerUserId()
    const now = 1_000_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const subscription = await createPendingSubscription(user, 'mensuel')

    const activated = await activateSubscription(subscription.id, 30)

    spy.mockRestore()
    expect(activated?.status).toBe('actif')
    expect(activated?.dateDebut).toBe(now)
    expect(activated?.dateFin).toBe(now + 30 * 24 * 60 * 60 * 1000)
  })

  it('activateSubscription renvoie null pour un identifiant inconnu', async () => {
    expect(await activateSubscription(randomUUID(), 30)).toBeNull()
  })
})

describe('essai gratuit à la première souscription (#281)', () => {
  it('un prestataire n’ayant jamais eu d’abonnement est éligible', async () => {
    expect(await isEligibleForTrial(await providerUserId())).toBe(true)
  })

  it('active immédiatement un abonnement, sans paiement préalable', async () => {
    const user = await providerUserId()
    const now = 1_000_000_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    const result = await activateTrialSubscription(user, 'mensuel')

    spy.mockRestore()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.subscription.status).toBe('actif')
      expect(result.subscription.isTrial).toBe(true)
      expect(result.subscription.dateDebut).toBe(now)
      expect(result.subscription.dateFin).toBe(now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)
    }
  })

  it('n’est plus éligible une fois l’essai consommé', async () => {
    const user = await providerUserId()
    await activateTrialSubscription(user, 'mensuel')
    expect(await isEligibleForTrial(user)).toBe(false)
  })

  it('refuse un second essai pour le même prestataire', async () => {
    const user = await providerUserId()
    await activateTrialSubscription(user, 'mensuel')
    expect(await activateTrialSubscription(user, 'trimestriel')).toEqual({ ok: false, error: 'already_used' })
  })

  it('refuse l’essai si un abonnement (même en attente, jamais activé) existe déjà', async () => {
    const user = await providerUserId()
    await createPendingSubscription(user, 'mensuel')
    expect(await isEligibleForTrial(user)).toBe(false)
    expect(await activateTrialSubscription(user, 'mensuel')).toEqual({ ok: false, error: 'already_used' })
  })

  it('un abonnement payé classique n’est pas marqué comme essai', async () => {
    const subscription = await createPendingSubscription(await providerUserId(), 'mensuel')
    const activated = await activateSubscription(subscription.id, 30)
    expect(activated?.isTrial).toBe(false)
  })
})
