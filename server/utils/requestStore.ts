import { randomUUID } from 'node:crypto'
import { DEFAULT_MATCH_WEIGHTS, rankProviders, type MatchBreakdown, type MatchCandidate, type MatchRequest, type Urgency } from '~~/server/utils/matchingEngine'
import { getEffectiveRating, searchProviders, type ProviderSearchResult } from '~~/server/utils/providerDirectory'
import { getProviderRequestsUsage, incrementProviderRequestsReceived } from '~~/server/utils/quotaStore'
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
async function isAtRequestsQuota(providerId: string): Promise<boolean> {
  const subscription = await getSubscriptionByUserId(providerId)
  if (!subscription) return false

  const plan = subscription.status === 'actif' ? subscription.plan : null
  const usage = getProviderRequestsUsage(providerId, plan)
  if (usage.limit === null) return false
  return usage.count >= usage.limit
}

/** Calcule (ou recalcule) le classement des prestataires pour une demande. */
export async function computeMatches(request: ServiceRequest, limit = 5): Promise<MatchedProvider[]> {
  const candidates = searchProviders(request.sector ? { sector: request.sector } : {})
  const candidatesById = new Map(candidates.map((provider) => [provider.id, provider]))

  const matchRequest: MatchRequest = {
    skills: request.skills,
    location: request.location,
    budgetMax: request.budgetMax,
    urgency: request.urgency,
  }

  // Statut de quota calculé une fois par candidat (lecture d'abonnement en
  // base, asynchrone) avant les filtres synchrones de partition.
  const atQuotaFlags = new Map<string, boolean>()
  for (const provider of candidates) {
    atQuotaFlags.set(provider.id, await isAtRequestsQuota(provider.id))
  }

  const available = candidates.filter((provider) => !atQuotaFlags.get(provider.id))
  const atQuota = candidates.filter((provider) => atQuotaFlags.get(provider.id))

  const rankedAvailable = rankProviders(matchRequest, available.map(toCandidate), DEFAULT_MATCH_WEIGHTS, limit)
  const remainingSlots = limit - rankedAvailable.length
  const rankedAtQuota =
    remainingSlots > 0 ? rankProviders(matchRequest, atQuota.map(toCandidate), DEFAULT_MATCH_WEIGHTS, remainingSlots) : []

  const matches: MatchedProvider[] = []
  for (const result of [...rankedAvailable, ...rankedAtQuota]) {
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

/**
 * Crée une demande et calcule immédiatement son top de correspondances.
 * Chaque prestataire retenu dans ce top voit son compteur de demandes
 * reçues du mois incrémenté (#63) — contrairement à
 * `GET /api/requests/:id/matches` qui ne fait que recalculer un instantané
 * sans incrémenter, pour ne pas compter plusieurs fois la même demande à
 * chaque consultation.
 */
export async function createServiceRequest(userId: string, input: CreateServiceRequestInput): Promise<ServiceRequest> {
  const request: ServiceRequest = {
    id: randomUUID(),
    userId,
    ...input,
    createdAt: Date.now(),
  }
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

/** Demandes du client, triées de la plus récente à la plus ancienne (« Mon espace », #64). */
export function listRequestsByUser(userId: string): ServiceRequest[] {
  return [...requests.values()]
    .filter((request) => request.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getStoredMatches(requestId: string): MatchedProvider[] | null {
  return matchesByRequestId.get(requestId) ?? null
}

/**
 * Toutes les demandes (fiches préalables), du plus récent au plus ancien
 * (#dashboard-admin, module Missions & fiches préalables). Lecture directe du
 * store en mémoire — voir docs/admin-dashboard.md pour la portée (données
 * réelles mais volatiles, perdues au redémarrage du process).
 */
export function listAllServiceRequests(): ServiceRequest[] {
  return [...requests.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export interface ProviderMatchedRequest {
  request: ServiceRequest
  score: MatchedProvider['score']
}

/**
 * Demandes où ce prestataire figure dans le top de correspondances calculé
 * à la création (« Demandes reçues », #hub-profil-prestataire) — pas de
 * flux d'acceptation/refus dans ce lot, uniquement la liste des demandes
 * dont ce prestataire a été notifié (compteur de quota déjà incrémenté par
 * createServiceRequest ci-dessus).
 */
export function listRequestsForProvider(providerId: string): ProviderMatchedRequest[] {
  const matched: ProviderMatchedRequest[] = []
  for (const request of requests.values()) {
    const match = matchesByRequestId.get(request.id)?.find((candidate) => candidate.providerId === providerId)
    if (match) matched.push({ request, score: match.score })
  }
  return matched.sort((a, b) => b.request.createdAt - a.request.createdAt)
}
