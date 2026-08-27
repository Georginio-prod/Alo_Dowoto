import type { Review as PrismaReview } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

/**
 * Notations mutuelles client/prestataire après collaboration (#61), désormais
 * **persistées en base** (Prisma/Postgres) — l'ancien store en mémoire est
 * remplacé, les avis survivent aux redémarrages et deviennent partageables par
 * le backend Express (ADR-0015/0017). Le comportement observable est **iso** :
 * mêmes règles, mêmes formes, seules les lectures passent d'un accès synchrone à
 * un accès `async` (source = base, comme providerStore en mode `db`).
 *
 * Une notation est rattachée à une conversation (matérialisation de la
 * collaboration dans ce prototype) et **unique par (conversationId, authorId)**
 * — chaque partie ne peut noter qu'une fois, dans un sens (client → prestataire)
 * comme dans l'autre. `targetId` (le noté) peut référencer une fiche de
 * l'annuaire de démonstration : pas de clé étrangère (même choix que
 * Favorite/Complaint).
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

function toReview(row: PrismaReview): Review {
  return {
    id: row.id,
    conversationId: row.conversationId,
    authorId: row.authorId,
    targetId: row.targetId,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.getTime(),
  }
}

/**
 * Soumet une notation pour la collaboration liée à `conversationId`. Refuse une
 * seconde notation du même auteur pour la même conversation (#61 — « empêche une
 * double notation pour la même collaboration »).
 */
export async function submitReview(
  conversationId: string,
  authorId: string,
  targetId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const existing = await prisma.review.findUnique({
    where: { conversationId_authorId: { conversationId, authorId } },
  })
  if (existing) {
    conflict('Vous avez déjà noté cette collaboration.')
  }

  const row = await prisma.review.create({
    data: { conversationId, authorId, targetId, rating, comment: comment?.trim() || null },
  })
  return toReview(row)
}

/** Indique si `authorId` a déjà noté la collaboration `conversationId`. */
export async function hasReviewed(conversationId: string, authorId: string): Promise<boolean> {
  const existing = await prisma.review.findUnique({
    where: { conversationId_authorId: { conversationId, authorId } },
    select: { id: true },
  })
  return existing !== null
}

/** Avis reçus par `targetId`, dans l'ordre chronologique de dépôt. */
export async function getReviewsForTarget(targetId: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({ where: { targetId }, orderBy: { createdAt: 'asc' } })
  return rows.map(toReview)
}

/**
 * Tous les avis enregistrés, du plus récent au plus ancien (#dashboard-admin,
 * module Avis & modération).
 */
export async function listAllReviews(): Promise<Review[]> {
  const rows = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(toReview)
}

/** Un avis précis par id (#dashboard-admin) — `null` si inexistant. */
export async function getReviewById(id: string): Promise<Review | null> {
  const row = await prisma.review.findUnique({ where: { id } })
  return row ? toReview(row) : null
}

/** Avis rédigés par un auteur donné (#dashboard-admin, module Chercheurs — « avis laissés »). */
export async function listReviewsByAuthor(authorId: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({ where: { authorId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toReview)
}

/** Moyenne et nombre d'avis reçus par `targetId` (0/0 si aucun avis). */
export async function getAverageRating(targetId: string): Promise<{ average: number, count: number }> {
  const reviews = await getReviewsForTarget(targetId)
  if (reviews.length === 0) return { average: 0, count: 0 }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return { average: total / reviews.length, count: reviews.length }
}
