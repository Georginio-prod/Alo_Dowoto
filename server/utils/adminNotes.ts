import { prisma } from '~~/server/utils/prisma'

/** Note interne, visible seulement par l'équipe WorkTogo (#dashboard-admin, modules Missions/Prestataires/Chercheurs). */
export async function addAdminNote(targetType: string, targetId: string, authorId: string, authorLabel: string, body: string): Promise<void> {
  await prisma.adminNote.create({ data: { targetType, targetId, authorId, authorLabel, body: body.trim() } })
}
