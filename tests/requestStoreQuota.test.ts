import { describe, expect, it } from 'vitest'
import { addUnavailabilityPeriod, todayIsoDate } from '~~/server/utils/providerAvailabilityStore'
import { incrementProviderRequestsReceived } from '~~/server/utils/quotaStore'
import { computeMatches, type ServiceRequest } from '~~/server/utils/requestStore'
import { activateSubscription, createPendingSubscription } from '~~/server/utils/subscriptionStore'

/**
 * Tests dédiés à la règle de quota de demandes reçues appliquée au
 * classement des prestataires (#63) — distincts de tests/matchingEngine.test.ts
 * qui ne couvre que le scoring pur, sans dépendance aux stores.
 */

let requestCounter = 0

function baseRequest(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  requestCounter += 1
  return {
    id: `req-quota-${requestCounter}`,
    userId: `client-quota-${requestCounter}`,
    title: 'Ménage complet',
    skills: ['Ménage à domicile'],
    description: '',
    budgetMax: 10000,
    urgency: 'flexible',
    location: 'Lomé',
    sector: 'menage',
    createdAt: Date.now(),
    ...overrides,
  }
}

function setProviderAtQuota(providerId: string) {
  const subscription = createPendingSubscription(providerId, 'mensuel')
  activateSubscription(subscription.id, 30)
  // Limite du plan mensuel (Starter) = 5 demandes/mois (#63).
  for (let i = 0; i < 5; i++) incrementProviderRequestsReceived(providerId)
}

describe('computeMatches — quota de demandes reçues (#63)', () => {
  it('rétrograde en fin de classement un prestataire ayant atteint son quota, sans l’exclure si la place est disponible', () => {
    setProviderAtQuota('p01')

    // Limite large (couvre tout le secteur) pour vérifier le rétrogradage
    // plutôt que l'exclusion pure.
    const matches = computeMatches(baseRequest(), 20)
    const rank = matches.findIndex((m) => m.providerId === 'p01')

    expect(rank).toBeGreaterThanOrEqual(0)
    expect(rank).toBe(matches.length - 1)
  })

  it('exclut un prestataire en quota quand le nombre de profils disponibles comble déjà le top demandé', () => {
    setProviderAtQuota('p03')

    const matches = computeMatches(baseRequest(), 1)
    expect(matches.find((m) => m.providerId === 'p03')).toBeUndefined()
  })

  it('ne pénalise pas un prestataire de l’annuaire de démonstration sans abonnement associé', () => {
    // Aucun des prestataires de secteur "menage" restants n'a d'abonnement :
    // le classement reste uniquement piloté par le score (#43, choix
    // pragmatique documenté dans requestStore.ts).
    const matches = computeMatches(baseRequest(), 5)
    expect(matches.length).toBe(5)
  })

  it('un abonnement non actif (en attente) retombe sur un quota de 0 — le prestataire est traité comme non disponible', () => {
    createPendingSubscription('p04', 'mensuel')
    // Pas d'activation : l'abonnement reste "en_attente".

    // À ce stade, p01 et p03 (tests précédents) sont aussi en quota : on
    // vérifie seulement que p04 est bien relégué dans le dernier groupe
    // (les 3 profils en quota), sans dépendre de l'ordre exact entre eux.
    const matches = computeMatches(baseRequest(), 20)
    const rank = matches.findIndex((m) => m.providerId === 'p04')

    expect(rank).toBeGreaterThanOrEqual(matches.length - 3)
  })
})

describe('computeMatches — disponibilité en temps réel (#290)', () => {
  it('exclut un prestataire indisponible aujourd’hui (les candidats viennent de searchProviders)', () => {
    const today = todayIsoDate()
    addUnavailabilityPeriod('p06', today, today)

    const matches = computeMatches(baseRequest(), 20)
    expect(matches.find((m) => m.providerId === 'p06')).toBeUndefined()
  })
})
