import { prisma } from '../config/prisma'

/**
 * Note interne d'administration (#dashboard-admin, modules Missions/Prestataires/
 * Chercheurs), portée iso depuis `server/utils/adminNotes.ts` (ADR-0017) —
 * visible seulement par l'équipe WorkTogo, jamais exposée publiquement.
 */
export async function addAdminNote(targetType: string, targetId: string, authorId: string, authorLabel: string, body: string): Promise<void> {
  await prisma.adminNote.create({ data: { targetType, targetId, authorId, authorLabel, body: body.trim() } })
}
