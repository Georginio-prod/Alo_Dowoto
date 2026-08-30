import { randomUUID } from 'node:crypto'
import {
  DEFAULT_MATCH_WEIGHTS,
  rankProviders,
  type MatchBreakdown,
  type MatchCandidate,
  type MatchRequest,
  type Urgency,
} from './matchingEngine'
import { getEffectiveRating, searchProviders, type ProviderSearchResult } from './providerDirectoryService'
import { getProviderRequestsUsage, incrementProviderRequestsReceived } from './quotaService'
import { subscriptionService } from './subscriptionService'

/**
 * Demandes clients et leurs correspondances calculées (#56/#63), porté iso
 * depuis `server/utils/requestStore.ts` (ADR-0016). **Volontairement en mémoire**
 * comme Nitro — mêmes structures volatiles (demandes + top de matches figé à la
 * création), donc « zéro changement fonctionnel ». La persistance reste un
 * chantier distinct. Compose l'annuaire (`searchProviders`/`getEffectiveRating`),
 * le moteur de scoring, les quotas et l'abonnement.
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

async function toCandidate(provider: ProviderSearchResult): Promise<MatchCandidate> {
  // Note effective (#61) SANS repli (iso Nitro `toCandidate`) : les fiches de
  // démo sans avis réels scorent donc sur une note de 0 — comportement exact à
  // préserver (l'affichage, lui, retombe sur la note figée plus bas).
  const { rating, reviewCount } = await getEffectiveRating(provider.id)
  return {
    providerId: provider.id,
    skills: [provider.subSector],
    location: provider.city,
    rating,
    reviewCount,
    // Pas de signal de disponibilité réel dans l'annuaire de démo : approximé
    // depuis le badge vérifié (iso Nitro).
    availability: provider.verified ? 1 : 0.7,
    priceFrom: provider.priceFrom,
  }
}

/**
 * Un prestataire ayant atteint son quota mensuel de demandes reçues (#63) n'est
 * pas retiré du classement mais rétrogradé en fin de liste. Une fiche de démo
 * sans abonnement (`getSubscriptionByUserId` → null) n'est pas concernée ; un
 * abonnement non actif retombe sur un quota de 0. Iso Nitro.
 */
async function isAtRequestsQuota(providerId: string): Promise<boolean> {
  const subscription = await subscriptionService.getSubscriptionByUserId(providerId)
  if (!subscription) return false

  const plan = subscription.status === 'actif' ? subscription.plan : null
  const usage = getProviderRequestsUsage(providerId, plan)
  if (usage.limit === null) return false
  return usage.count >= usage.limit
}

/** Calcule (ou recalcule) le classement des prestataires pour une demande. */
export async function computeMatches(request: ServiceRequest, limit = 5): Promise<MatchedProvider[]> {
  const candidates = await searchProviders(request.sector ? { sector: request.sector } : {})
  const candidatesById = new Map(candidates.map((provider) => [provider.id, provider]))

  const matchRequest: MatchRequest = {
    skills: request.skills,
    location: request.location,
    budgetMax: request.budgetMax,
    urgency: request.urgency,
  }

  // Statut de quota calculé une fois par candidat (lecture d'abonnement async)
  // avant les filtres synchrones de partition.
  const atQuotaFlags = new Map<string, boolean>()
  for (const provider of candidates) {
    atQuotaFlags.set(provider.id, await isAtRequestsQuota(provider.id))
  }

  const available = candidates.filter((provider) => !atQuotaFlags.get(provider.id))
  const atQuota = candidates.filter((provider) => atQuotaFlags.get(provider.id))

  const rankedAvailable = rankProviders(matchRequest, await Promise.all(available.map(toCandidate)), DEFAULT_MATCH_WEIGHTS, limit)
  const remainingSlots = limit - rankedAvailable.length
  const rankedAtQuota =
    remainingSlots > 0 ? rankProviders(matchRequest, await Promise.all(atQuota.map(toCandidate)), DEFAULT_MATCH_WEIGHTS, remainingSlots) : []

  const matches: MatchedProvider[] = []
  for (const result of [...rankedAvailable, ...rankedAtQuota]) {
    const provider = candidatesById.get(result.providerId)
    if (!provider) continue
    // Même note effective que le scoring, MAIS avec repli sur la note figée (#61)
    // → l'affichage montre la moyenne à jour, cohérente avec le classement.
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

/**
 * Crée une demande et calcule immédiatement son top de correspondances. Chaque
 * prestataire retenu voit son compteur de demandes reçues du mois incrémenté
 * (#63) — contrairement à `GET /requests/:id/matches` qui recalcule un
 * instantané sans incrémenter. Iso Nitro.
 */
export async function createServiceRequest(userId: string, input: CreateServiceRequestInput): Promise<ServiceRequest> {
  const request: ServiceRequest = { id: randomUUID(), userId, ...input, createdAt: Date.now() }
  requests.set(request.id, request)
  const matches = await computeMatches(request)
  matchesByRequestId.set(request.id, matches)
  for (const match of matches) {
    incrementProviderRequestsReceived(match.providerId)
  }
  return request
}

export function getServiceRequest(id: string): ServiceRequest | null {
  return requests.get(id) ?? null
}

/** Demandes du client, de la plus récente à la plus ancienne (« Mon espace », #64). */
export function listRequestsByUser(userId: string): ServiceRequest[] {
  return [...requests.values()]
    .filter((request) => request.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Toutes les fiches préalables en mémoire, la plus récente d'abord — brouillons
 * de missions pour le dashboard admin (#dashboard-admin, module 4). Volatile
 * (store en mémoire), comme côté Nitro. Iso `requestStore.listAllServiceRequests`.
 */
export function listAllServiceRequests(): ServiceRequest[] {
  return [...requests.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export function getStoredMatches(requestId: string): MatchedProvider[] | null {
  return matchesByRequestId.get(requestId) ?? null
}

export interface ProviderMatchedRequest {
  request: ServiceRequest
  score: MatchedProvider['score']
}

/**
 * Demandes où ce prestataire figure dans le top calculé à la création
 * (« Demandes reçues ») — pas de flux d'acceptation/refus dans ce lot. Iso Nitro.
 */
export function listRequestsForProvider(providerId: string): ProviderMatchedRequest[] {
  const matched: ProviderMatchedRequest[] = []
  for (const request of requests.values()) {
    const match = matchesByRequestId.get(request.id)?.find((candidate) => candidate.providerId === providerId)
    if (match) matched.push({ request, score: match.score })
  }
  return matched.sort((a, b) => b.request.createdAt - a.request.createdAt)
}
