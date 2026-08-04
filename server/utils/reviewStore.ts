import { randomUUID } from 'node:crypto'

/**
 * Store en mémoire pour les notations mutuelles client/prestataire, une
 * fois la collaboration entamée (#61). Suffisant pour ce lot (pas de base
 * de données encore en place, voir #45/#46 ; le modèle `Review` de
 * `prisma/schema.prisma` documente la persistance future, pas encore
 * branchée).
 *
 * Une notation est rattachée à une conversation (voir conversationStore.ts)
 * plutôt qu'à une demande : c'est la conversation qui matérialise la
 * collaboration entre les deux parties dans ce prototype. Elle est unique
 * par (conversationId, authorId) — chaque partie ne peut noter qu'une fois
 * la même collaboration, dans un sens (client → prestataire) comme dans
 * l'autre (prestataire → client).
 */

export interface Review {
  id: string
  conversationId: string
  authorId: string
  targetId: string
  rating: number
  comment: string | null
  createdAt: number
}

const reviewByConversationAndAuthor = new Map<string, Review>()
const reviewsByTarget = new Map<string, Review[]>()

function reviewKey(conversationId: string, authorId: string): string {
  return `${conversationId}:${authorId}`
}

/**
 * Soumet une notation pour la collaboration liée à `conversationId`. Refuse
 * une seconde notation du même auteur pour la même conversation (#61 —
 * « empêche une double notation pour la même collaboration »).
 */
export function submitReview(
  conversationId: string,
  authorId: string,
  targetId: string,
  rating: number,
  comment?: string,
): Review {
  const key = reviewKey(conversationId, authorId)
  if (reviewByConversationAndAuthor.has(key)) {
    conflict('Vous avez déjà noté cette collaboration.')
  }

  const review: Review = {
    id: randomUUID(),
    conversationId,
    authorId,
    targetId,
    rating,
    comment: comment?.trim() || null,
    createdAt: Date.now(),
  }
  reviewByConversationAndAuthor.set(key, review)

  const targetReviews = reviewsByTarget.get(targetId)
  if (targetReviews) {
    targetReviews.push(review)
  } else {
    reviewsByTarget.set(targetId, [review])
  }

  return review
}

/** Indique si `authorId` a déjà noté la collaboration `conversationId`. */
export function hasReviewed(conversationId: string, authorId: string): boolean {
  return reviewByConversationAndAuthor.has(reviewKey(conversationId, authorId))
}

export function getReviewsForTarget(targetId: string): Review[] {
  return reviewsByTarget.get(targetId) ?? []
}

/**
 * Tous les avis enregistrés, du plus récent au plus ancien (#dashboard-admin,
 * module Avis & modération). Lecture directe du store en mémoire — voir
 * docs/admin-dashboard.md pour la portée (données réelles mais volatiles,
 * perdues au redémarrage du process).
 */
export function listAllReviews(): Review[] {
  return [...reviewByConversationAndAuthor.values()].sort((a, b) => b.createdAt - a.createdAt)
}

/** Un avis précis par id (#dashboard-admin) — `null` si inexistant. */
export function getReviewById(id: string): Review | null {
  for (const review of reviewByConversationAndAuthor.values()) {
    if (review.id === id) return review
  }
  return null
}

/** Avis rédigés par un auteur donné (#dashboard-admin, module Chercheurs — « avis laissés »). */
export function listReviewsByAuthor(authorId: string): Review[] {
  return [...reviewByConversationAndAuthor.values()]
    .filter((review) => review.authorId === authorId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Moyenne et nombre d'avis reçus par `targetId` (0/0 si aucun avis). */
export function getAverageRating(targetId: string): { average: number, count: number } {
  const reviews = getReviewsForTarget(targetId)
  if (reviews.length === 0) return { average: 0, count: 0 }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return { average: total / reviews.length, count: reviews.length }
}
