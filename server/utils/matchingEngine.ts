/**
 * Moteur de scoring pondéré des prestataires pour une demande client (#54).
 *
 * Fonction pure (aucune dépendance à un store ou à l'event H3) afin de
 * rester facilement testable et réutilisable depuis l'API (#56) comme
 * depuis des tests unitaires (#49).
 */

export type Urgency = 'immediate' | 'semaine' | 'flexible'

export interface MatchRequest {
  skills: string[]
  location: string
  budgetMax: number
  urgency: Urgency
}

export interface MatchCandidate {
  providerId: string
  skills: string[]
  location: string
  rating: number
  reviewCount: number
  /** 0 (indisponible) à 1 (disponible immédiatement). */
  availability: number
  priceFrom: number
}

export interface MatchWeights {
  skills: number
  location: number
  reviews: number
  availability: number
  budget: number
}

export interface MatchBreakdown {
  skills: number
  location: number
  reviews: number
  availability: number
  budget: number
}

export interface MatchResult {
  providerId: string
  total: number
  breakdown: MatchBreakdown
}

/** Pondération par défaut — reprend le tableau de l'issue #54. */
export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skills: 0.3,
  location: 0.2,
  reviews: 0.2,
  availability: 0.15,
  budget: 0.15,
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function scoreSkills(requestSkills: string[], candidateSkills: string[]): number {
  if (requestSkills.length === 0) return 1
  const candidateSet = new Set(candidateSkills.map(normalize))
  const matched = requestSkills.filter((skill) => candidateSet.has(normalize(skill))).length
  return matched / requestSkills.length
}

function scoreLocation(requestLocation: string, candidateLocation: string): number {
  const a = normalize(requestLocation)
  const b = normalize(candidateLocation)
  if (!a || !b) return 0.5
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.6
  return 0.1
}

function scoreReviews(rating: number, reviewCount: number): number {
  const ratingScore = clamp01(rating / 5)
  const volumeScore = clamp01(reviewCount / 20)
  return ratingScore * 0.8 + volumeScore * 0.2
}

function scoreBudget(budgetMax: number, priceFrom: number): number {
  if (!budgetMax || budgetMax <= 0) return 1
  if (priceFrom <= budgetMax) return 1
  return clamp01(1 - (priceFrom - budgetMax) / budgetMax)
}

/** Calcule le score d'un prestataire pour une demande donnée. */
export function scoreProvider(
  request: MatchRequest,
  candidate: MatchCandidate,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
): MatchResult {
  const breakdown = {
    skills: scoreSkills(request.skills, candidate.skills),
    location: scoreLocation(request.location, candidate.location),
    reviews: scoreReviews(candidate.rating, candidate.reviewCount),
    availability: clamp01(candidate.availability),
    budget: scoreBudget(request.budgetMax, candidate.priceFrom),
  }

  const total =
    breakdown.skills * weights.skills +
    breakdown.location * weights.location +
    breakdown.reviews * weights.reviews +
    breakdown.availability * weights.availability +
    breakdown.budget * weights.budget

  return {
    providerId: candidate.providerId,
    total: Math.round(total * 100),
    breakdown: {
      skills: Math.round(breakdown.skills * 100),
      location: Math.round(breakdown.location * 100),
      reviews: Math.round(breakdown.reviews * 100),
      availability: Math.round(breakdown.availability * 100),
      budget: Math.round(breakdown.budget * 100),
    },
  }
}

/** Classe les prestataires par score décroissant et retourne le top N (5 par défaut). */
export function rankProviders(
  request: MatchRequest,
  candidates: MatchCandidate[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  limit = 5,
): MatchResult[] {
  return candidates
    .map((candidate) => scoreProvider(request, candidate, weights))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/**
 * Mise en avant des meilleurs prestataires sur l'accueil chercheur (#187).
 *
 * Contrairement à `scoreProvider`, ce classement n'est adossé à aucune
 * demande précise (pas de compétences/localisation/budget à comparer) : il
 * ne réutilise donc que les briques pures du moteur (`clamp01`,
 * `bayesianRating`) plutôt que de forcer `scoreProvider` à travers une
 * fausse « demande neutre », ce qui aurait dilué la sémantique de ses
 * sous-scores (skills/location/budget) sans rien y gagner.
 */

export interface FeaturedCandidate {
  providerId: string
  rating: number
  reviewCount: number
  verified: boolean
  /** Approximation dérivée du nombre d'avis, voir providerDirectory.estimateExperienceYears. */
  experienceYears: number
}

export interface FeaturedWeights {
  rating: number
  verified: number
  experience: number
}

export interface FeaturedResult {
  providerId: string
  total: number
  /** Note ajustée par bayesianRating (sur 5), utile pour l'affichage/debug. */
  adjustedRating: number
}

/** Pondération par défaut du score de mise en avant (#187). */
export const DEFAULT_FEATURED_WEIGHTS: FeaturedWeights = {
  rating: 0.7,
  verified: 0.15,
  experience: 0.15,
}

/** Note moyenne « de référence » utilisée tant qu'un prestataire n'a aucun avis. */
export const FEATURED_PRIOR_MEAN = 3.5
/** Nombre d'avis fictifs attribués à la moyenne de référence (force du lissage). */
export const FEATURED_PRIOR_WEIGHT = 5

/**
 * Moyenne bayésienne : ramène la note d'un prestataire avec peu d'avis vers
 * une moyenne de référence (`priorMean`), pondérée par un nombre d'avis
 * fictif (`priorWeight`). Empêche qu'un seul avis à 5★ écrase des
 * prestataires établis avec des dizaines d'avis solides — c'est cet écart
 * que la simple moyenne (`rating`) ne corrige pas (#187).
 */
export function bayesianRating(
  avg: number,
  count: number,
  priorMean: number = FEATURED_PRIOR_MEAN,
  priorWeight: number = FEATURED_PRIOR_WEIGHT,
): number {
  if (count <= 0) return priorMean
  return (priorWeight * priorMean + count * avg) / (priorWeight + count)
}

function scoreExperience(experienceYears: number): number {
  // 5 ans et plus valent le score maximum ; en dessous, proportionnel.
  return clamp01(experienceYears / 5)
}

/** Calcule le score de mise en avant d'un prestataire (#187). */
export function scoreFeaturedProvider(
  candidate: FeaturedCandidate,
  weights: FeaturedWeights = DEFAULT_FEATURED_WEIGHTS,
): FeaturedResult {
  const adjustedRating = bayesianRating(candidate.rating, candidate.reviewCount)
  const ratingScore = clamp01(adjustedRating / 5)
  const verifiedScore = candidate.verified ? 1 : 0
  const experienceScore = scoreExperience(candidate.experienceYears)

  const total = ratingScore * weights.rating + verifiedScore * weights.verified + experienceScore * weights.experience

  return {
    providerId: candidate.providerId,
    total: Math.round(total * 100),
    adjustedRating: Math.round(adjustedRating * 100) / 100,
  }
}

/** Classe les prestataires par score de mise en avant décroissant (#187). */
export function rankFeaturedProviders(
  candidates: FeaturedCandidate[],
  weights: FeaturedWeights = DEFAULT_FEATURED_WEIGHTS,
  limit = 6,
): FeaturedResult[] {
  return candidates
    .map((candidate) => scoreFeaturedProvider(candidate, weights))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}
