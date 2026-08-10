import { prisma } from '~~/server/utils/prisma'

/**
 * Progression des tutoriels côté serveur (#tutoriel-onboarding). Une ligne par
 * section « vue » et par utilisateur (modèle TutorialProgress). Permet la
 * synchronisation inter-appareils : l'app reste local-first, ces fonctions ne
 * font que lire/écrire l'état durable.
 */

/** Identifiants des sections déjà vues par cet utilisateur. */
export async function listSeenSections(userId: string): Promise<string[]> {
  const rows = await prisma.tutorialProgress.findMany({ where: { userId }, select: { sectionId: true } })
  return rows.map((r) => r.sectionId)
}

/** Marque une section comme vue (upsert idempotent, incrémente le compteur de consultations). */
export async function markSectionSeen(userId: string, sectionId: string): Promise<void> {
  await prisma.tutorialProgress.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    create: { userId, sectionId },
    update: { views: { increment: 1 }, updatedAt: new Date() },
  })
}

/** « Réinitialiser les tutoriels » — supprime toute la progression de l'utilisateur. */
export async function resetProgress(userId: string): Promise<void> {
  await prisma.tutorialProgress.deleteMany({ where: { userId } })
}
