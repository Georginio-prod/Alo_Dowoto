import { prisma } from '../config/prisma'
import { detectContournementAttempt } from '../utils/contournementDetector'
import { reviewService, type Review } from './reviewService'

/**
 * Vue admin des avis (#dashboard-admin, module 8), portée iso depuis
 * `server/utils/adminReviewStore.ts` (ADR-0017) : lit les avis mutuels réels
 * (`prisma.review` via `reviewService`) et les enrichit d'un état de modération
 * durable (`ReviewModeration`, clé sur `review.id`). Le signalement automatique
 * réutilise le détecteur de contournement (#anti-contournement).
 */

/** Mots insultants (liste courte locale à ce module — pas un filtre général de messagerie). */
const INSULT_WORDS = ['con', 'connard', 'salope', 'merde', 'putain', 'idiot', 'imbécile', 'débile', 'nul']

function containsInsult(text: string): boolean {
  const normalized = text.toLowerCase()
  return INSULT_WORDS.some((word) => new RegExp(`\\b${word}\\b`).test(normalized))
}

export interface AdminReviewRow extends Review {
  hidden: boolean
  hiddenReason: string | null
  flagged: boolean
  flagReason: string | null
  autoFlagReason: 'phone' | 'off_platform_mention' | 'insult' | null
}

export async function listAdminReviews(onlyFlagged: boolean): Promise<AdminReviewRow[]> {
  const reviews = await reviewService.listAll()
  const moderations = await prisma.reviewModeration.findMany({ where: { reviewId: { in: reviews.map((r) => r.id) } } })
  const moderationById = new Map(moderations.map((m) => [m.reviewId, m]))

  const rows: AdminReviewRow[] = reviews.map((review) => {
    const moderation = moderationById.get(review.id)
    const comment = review.comment ?? ''
    const contournement = detectContournementAttempt(comment)
    const autoFlagReason = contournement === 'phone' || contournement === 'off_platform_mention'
      ? contournement
      : containsInsult(comment) ? 'insult' : null

    return {
      ...review,
      hidden: moderation?.hidden ?? false,
      hiddenReason: moderation?.hiddenReason ?? null,
      flagged: (moderation?.flagged ?? false) || autoFlagReason !== null,
      flagReason: moderation?.flagReason ?? null,
      autoFlagReason,
    }
  })

  // Signalés (auto ou manuel) en tête, ensuite les plus récents.
  rows.sort((a, b) => {
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1
    return b.createdAt - a.createdAt
  })

  return onlyFlagged ? rows.filter((r) => r.flagged) : rows
}

export async function hideReview(reviewId: string, reason: string): Promise<void> {
  await prisma.reviewModeration.upsert({
    where: { reviewId },
    create: { reviewId, hidden: true, hiddenReason: reason },
    update: { hidden: true, hiddenReason: reason },
  })
}

export async function restoreReview(reviewId: string): Promise<void> {
  await prisma.reviewModeration.upsert({
    where: { reviewId },
    create: { reviewId, hidden: false, restoredAt: new Date() },
    update: { hidden: false, restoredAt: new Date() },
  })
}

/** Suppression avec motif — modélisée comme un masquage définitif (pas de suppression physique par id). Iso Nitro. */
export async function deleteReview(reviewId: string, reason: string): Promise<void> {
  await hideReview(reviewId, reason)
}

export async function markReviewFalsePositive(reviewId: string): Promise<void> {
  await prisma.reviewModeration.upsert({
    where: { reviewId },
    create: { reviewId, flagged: false },
    update: { flagged: false, flagReason: null },
  })
}
