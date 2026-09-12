import { randomUUID } from 'node:crypto'
import {
  DEFAULT_MATCH_WEIGHTS,
  rankProviders,
  type MatchBreakdown,
  type MatchCandidate,
  type MatchRequest,
  type Urgency,
} from './matchingEngine'
import { env } from '../config/env'
import { getEffectiveRating, searchProviders, type ProviderSearchResult } from './providerDirectoryService'
import { getProviderRequestsUsage, incrementProviderRequestsReceived } from './quotaService'
import { subscriptionService } from './subscriptionService'
import {
  serviceRequestRepository,
  type ServiceRequestRepository,
  type StoredMatch,
  type StoredServiceRequest,
} from '../repositories/serviceRequestRepository'

/** Demande de prestation, persistée avec ses correspondances dans PostgreSQL. */
export interface ServiceRequest extends Omit<StoredServiceRequest, 'urgency'> {
  urgency: Urgency
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
  experienceYears: number
  score: { total: number; breakdown: MatchBreakdown }
}

function toRequest(request: StoredServiceRequest): ServiceRequest {
  return { ...request, urgency: request.urgency as Urgency }
}

function toStoredMatch(match: MatchedProvider): StoredMatch {
  return { ...match, position: 0, score: JSON.stringify(match.score) }
}

function toMatch(match: StoredMatch): MatchedProvider {
  const { position: _position, score: rawScore, ...provider } = match
  try {
    return { ...provider, score: JSON.parse(rawScore) as MatchedProvider['score'] }
  } catch {
    return { ...provider, score: { total: 0, breakdown: { skills: 0, location: 0, reviews: 0, availability: 0, budget: 0 } } }
  }
}

async function toCandidate(provider: ProviderSearchResult): Promise<MatchCandidate> {
  const { rating, reviewCount } = await getEffectiveRating(provider.id)
  return {
    providerId: provider.id,
    skills: [provider.subSector],
    location: provider.city,
    rating,
    reviewCount,
    availability: provider.verified ? 1 : 0.7,
    priceFrom: provider.priceFrom,
  }
}

async function isAtRequestsQuota(providerId: string): Promise<boolean> {
  // Parcours d'abonnement masqué (SUBSCRIPTION_ENABLED=false) : aucun plafond,
  // y compris pour un abonnement resté « en attente » ou expiré, qui aurait
  // sinon une limite de 0 et serait relégué en fin de classement.
  if (!env.subscriptionEnabled) return false
  const subscription = await subscriptionService.getSubscriptionByUserId(providerId)
  if (!subscription) return false
  const usage = await getProviderRequestsUsage(providerId, subscription.status === 'actif' ? subscription.plan : null)
  return usage.limit !== null && usage.count >= usage.limit
}

/** Recalcule le classement sans modifier les compteurs de quota. */
export async function computeMatches(request: ServiceRequest, limit = 5): Promise<MatchedProvider[]> {
  const candidates = await searchProviders(request.sector ? { sector: request.sector } : {})
  const candidatesById = new Map(candidates.map((provider) => [provider.id, provider]))
  const matchRequest: MatchRequest = {
    skills: request.skills,
    location: request.location,
    budgetMax: request.budgetMax,
    urgency: request.urgency,
  }

  const atQuotaFlags = new Map<string, boolean>()
  for (const provider of candidates) atQuotaFlags.set(provider.id, await isAtRequestsQuota(provider.id))

  const available = candidates.filter((provider) => !atQuotaFlags.get(provider.id))
  const atQuota = candidates.filter((provider) => atQuotaFlags.get(provider.id))
  const rankedAvailable = rankProviders(matchRequest, await Promise.all(available.map(toCandidate)), DEFAULT_MATCH_WEIGHTS, limit)
  const remainingSlots = limit - rankedAvailable.length
  const rankedAtQuota = remainingSlots > 0
    ? rankProviders(matchRequest, await Promise.all(atQuota.map(toCandidate)), DEFAULT_MATCH_WEIGHTS, remainingSlots)
    : []

  const matches: MatchedProvider[] = []
  for (const result of [...rankedAvailable, ...rankedAtQuota]) {
    const provider = candidatesById.get(result.providerId)
    if (!provider) continue
    const { rating, reviewCount } = await getEffectiveRating(provider.id, { rating: provider.rating, reviewCount: provider.reviewCount })
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

export function createRequestService(repository: ServiceRequestRepository = serviceRequestRepository) {
  return {
    async createServiceRequest(userId: string, input: CreateServiceRequestInput): Promise<ServiceRequest> {
      const request = toRequest(await repository.create({ id: randomUUID(), userId, ...input, createdAt: Date.now() }))
      const matches = await computeMatches(request)
      await repository.replaceMatches(request.id, matches.map((match, position) => ({ ...toStoredMatch(match), position })))
      await Promise.all(matches.map((match) => incrementProviderRequestsReceived(match.providerId)))
      return request
    },
    async getServiceRequest(id: string): Promise<ServiceRequest | null> {
      const request = await repository.findById(id)
      return request ? toRequest(request) : null
    },
    async listRequestsByUser(userId: string): Promise<ServiceRequest[]> {
      return (await repository.listByUser(userId)).map(toRequest)
    },
    async listAllServiceRequests(limit = 20): Promise<ServiceRequest[]> {
      return (await repository.listRecent(limit)).map(toRequest)
    },
    async getStoredMatches(requestId: string): Promise<MatchedProvider[]> {
      return (await repository.listMatches(requestId)).map(toMatch)
    },
    async listRequestsForProvider(providerId: string): Promise<ProviderMatchedRequest[]> {
      return (await repository.listMatchesForProvider(providerId)).map(({ request, match }) => ({ request: toRequest(request), score: toMatch(match).score }))
    },
  }
}

export interface ProviderMatchedRequest {
  request: ServiceRequest
  score: MatchedProvider['score']
}

export const requestService = createRequestService()
export const createServiceRequest = requestService.createServiceRequest
export const getServiceRequest = requestService.getServiceRequest
export const listRequestsByUser = requestService.listRequestsByUser
export const listAllServiceRequests = requestService.listAllServiceRequests
export const getStoredMatches = requestService.getStoredMatches
export const listRequestsForProvider = requestService.listRequestsForProvider
