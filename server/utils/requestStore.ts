import { randomUUID } from 'node:crypto'
import type { MatchBreakdown, MatchCandidate, MatchRequest, Urgency } from '~~/server/utils/matchingEngine'
import { getEffectiveRating, type ProviderSearchResult } from '~~/server/utils/providerDirectory'

/**
 * Store en mémoire pour les demandes clients et leurs correspondances
 * calculées (#56). Suffisant pour ce lot (pas de base de données encore en
 * place, voir #45/#46).
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
  // Note effective (#61) : reflète la moyenne recalculée à partir des avis
  // dès qu'il y en a, sinon retombe sur la valeur figée de l'annuaire de
  // démo — voir providerDirectory.getEffectiveRating.
  const { rating, reviewCount } = getEffectiveRating(provider.id)
  return {
    providerId: provider.id,
    skills: [provider.subSector],
    location: provider.city,
    rating,
    reviewCount,
    // Pas de champ de disponibilité réel dans l'annuaire de démonstration
    // (#43) : approximé à partir du badge vérifié en attendant un vrai
    // signal de disponibilité côté prestataire.
    availability: provider.verified ? 1 : 0.7,
    priceFrom: provider.priceFrom,
  }
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
  const ranked = rankProviders(matchRequest, candidates.map(toCandidate), DEFAULT_MATCH_WEIGHTS, limit)

  const matches: MatchedProvider[] = []
  for (const result of ranked) {
    const provider = candidatesById.get(result.providerId)
    if (!provider) continue
    // Même note effective que celle utilisée pour le scoring (#61) : la
    // maquette affiche donc la moyenne à jour, cohérente avec le classement.
    const { rating, reviewCount } = getEffectiveRating(provider.id)
    matches.push({
      providerId: provider.id,
      displayName: provider.displayName,
      subSector: provider.subSector,
      city: provider.city,
      verified: provider.verified,
      rating,
      reviewCount,
      priceFrom: provider.priceFrom,
      experienceYears: Math.max(1, Math.round(reviewCount / 8)),
      score: { total: result.total, breakdown: result.breakdown },
    })
  }
  return matches
}

/** Crée une demande et calcule immédiatement son top de correspondances. */
export function createServiceRequest(userId: string, input: CreateServiceRequestInput): ServiceRequest {
  const request: ServiceRequest = {
    id: randomUUID(),
    userId,
    ...input,
    createdAt: Date.now(),
  }
  requests.set(request.id, request)
  matchesByRequestId.set(request.id, computeMatches(request))
  return request
}

export function getServiceRequest(id: string): ServiceRequest | null {
  return requests.get(id) ?? null
}

export function getStoredMatches(requestId: string): MatchedProvider[] | null {
  return matchesByRequestId.get(requestId) ?? null
}
