import { randomUUID } from 'node:crypto'
import { DEFAULT_MATCH_WEIGHTS, rankProviders, type MatchBreakdown, type MatchCandidate, type MatchRequest, type Urgency } from '~~/server/utils/matchingEngine'
import { getProviderRequestsUsage, incrementProviderRequestsReceived } from '~~/server/utils/quotaStore'
import { searchProviders, type ProviderSearchResult } from '~~/server/utils/providerDirectory'
import { getSubscriptionByUserId } from '~~/server/utils/subscriptionStore'

/**
 * Store en mémoire pour les demandes clients et leurs correspondances
 * calculées (#56). Suffisant pour ce lot (pas de base de données encore en
 * place, voir #45/#46).
 *
 * Les fonctions des autres stores sont importées explicitement ici (plutôt
 * que de compter sur l'auto-import de Nitro comme ailleurs) pour que
 * `computeMatches` reste testable directement sous Vitest (#63), qui ne
 * répond pas aux auto-imports serveur.
 */

export interface ServiceRequest {
  id: string
  userId: string
  title: string
  skills: string[]
  description: string
  budgetMax: number
  urgency: Urgency
  location: string
  sector?: string
  createdAt: number
}

export interface CreateServiceRequestInput {
  title: string
  skills: string[]
  description: string
  budgetMax: number
  urgency: Urgency
  location: string
  sector?: string
}

export interface MatchedProvider {
  providerId: string
  displayName: string
  subSector: string
  city: string
  verified: boolean
  rating: number
  reviewCount: number
  priceFrom: number
  /** Approximation dérivée du nombre d'avis (pas de champ dédié pour l'instant). */
  experienceYears: number
  score: { total: number; breakdown: MatchBreakdown }
}

const requests = new Map<string, ServiceRequest>()
const matchesByRequestId = new Map<string, MatchedProvider[]>()

function toCandidate(provider: ProviderSearchResult): MatchCandidate {
  return {
    providerId: provider.id,
    skills: [provider.subSector],
    location: provider.city,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    // Pas de champ de disponibilité réel dans l'annuaire de démonstration
    // (#43) : approximé à partir du badge vérifié en attendant un vrai
    // signal de disponibilité côté prestataire.
    availability: provider.verified ? 1 : 0.7,
    priceFrom: provider.priceFrom,
  }
}

/**
 * Un prestataire ayant atteint son quota mensuel de demandes reçues (#63,
 * selon sa formule d'abonnement) n'est pas retiré du classement mais
 * rétrogradé en fin de liste — il ne doit simplement jamais prendre la
 * place d'un prestataire encore disponible.
 *
 * Choix pragmatique documenté : un prestataire de l'annuaire de
 * démonstration (#43) sans aucun abonnement associé (`getSubscriptionByUserId`
 * renvoie `null`) n'est pas concerné par cette règle, ces fiches ne
 * correspondant pas à de vrais comptes prestataire. Un abonnement existant
 * mais non actif (en attente/expiré) retombe en revanche sur un quota de 0
 * (non éligible à recevoir de nouvelles demandes tant qu'il n'est pas actif).
 */
function isAtRequestsQuota(providerId: string): boolean {
  const subscription = getSubscriptionByUserId(providerId)
  if (!subscription) return false

  const plan = subscription.status === 'actif' ? subscription.plan : null
  const usage = getProviderRequestsUsage(providerId, plan)
  if (usage.limit === null) return false
  return usage.count >= usage.limit
}

/** Calcule (ou recalcule) le classement des prestataires pour une demande. */
export function computeMatches(request: ServiceRequest, limit = 5): MatchedProvider[] {
  const candidates = searchProviders(request.sector ? { sector: request.sector } : {})
  const candidatesById = new Map(candidates.map((provider) => [provider.id, provider]))

  const matchRequest: MatchRequest = {
    skills: request.skills,
    location: request.location,
    budgetMax: request.budgetMax,
    urgency: request.urgency,
  }

  const available = candidates.filter((provider) => !isAtRequestsQuota(provider.id))
  const atQuota = candidates.filter((provider) => isAtRequestsQuota(provider.id))

  const rankedAvailable = rankProviders(matchRequest, available.map(toCandidate), DEFAULT_MATCH_WEIGHTS, limit)
  const remainingSlots = limit - rankedAvailable.length
  const rankedAtQuota =
    remainingSlots > 0 ? rankProviders(matchRequest, atQuota.map(toCandidate), DEFAULT_MATCH_WEIGHTS, remainingSlots) : []

  const matches: MatchedProvider[] = []
  for (const result of [...rankedAvailable, ...rankedAtQuota]) {
    const provider = candidatesById.get(result.providerId)
    if (!provider) continue
    matches.push({
      providerId: provider.id,
      displayName: provider.displayName,
      subSector: provider.subSector,
      city: provider.city,
      verified: provider.verified,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
      priceFrom: provider.priceFrom,
      experienceYears: Math.max(1, Math.round(provider.reviewCount / 8)),
      score: { total: result.total, breakdown: result.breakdown },
    })
  }
  return matches
}

/**
 * Crée une demande et calcule immédiatement son top de correspondances.
 * Chaque prestataire retenu dans ce top voit son compteur de demandes
 * reçues du mois incrémenté (#63) — contrairement à
 * `GET /api/requests/:id/matches` qui ne fait que recalculer un instantané
 * sans incrémenter, pour ne pas compter plusieurs fois la même demande à
 * chaque consultation.
 */
export function createServiceRequest(userId: string, input: CreateServiceRequestInput): ServiceRequest {
  const request: ServiceRequest = {
    id: randomUUID(),
    userId,
    ...input,
    createdAt: Date.now(),
  }
  requests.set(request.id, request)
  const matches = computeMatches(request)
  matchesByRequestId.set(request.id, matches)
  for (const match of matches) {
    incrementProviderRequestsReceived(match.providerId)
  }
  return request
}

export function getServiceRequest(id: string): ServiceRequest | null {
  return requests.get(id) ?? null
}

export function getStoredMatches(requestId: string): MatchedProvider[] | null {
  return matchesByRequestId.get(requestId) ?? null
}
