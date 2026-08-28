import type { Complaint as PrismaComplaint } from '@prisma/client'
import { complaintRepository, type ComplaintRepository } from '../repositories/complaintRepository'
import type { ComplaintCategory } from '../validation/schemas/reclamations'

/**
 * Réclamations (#357). Logique **portée iso** depuis
 * `server/utils/complaintStore.ts` (ADR-0016) : même création, même référence de
 * suivi. Agnostique du framework (repository Prisma injecté).
 */

export interface Complaint {
  id: string
  category: ComplaintCategory
  subject: string
  message: string
  contactEmail: string
  userId: string | null
  createdAt: number
}

function toComplaint(row: PrismaComplaint): Complaint {
  return {
    id: row.id,
    category: row.category as ComplaintCategory,
    subject: row.subject,
    message: row.message,
    contactEmail: row.contactEmail,
    userId: row.userId,
    createdAt: row.createdAt.getTime(),
  }
}

/** Référence courte et lisible affichée à l'utilisateur pour le suivi. Iso `complaintStore.ts`. */
export function complaintReference(complaint: Complaint): string {
  return `REF-${complaint.id.slice(0, 8).toUpperCase()}`
}

export function createComplaintService(repo: ComplaintRepository = complaintRepository) {
  return {
    async addComplaint(
      category: ComplaintCategory,
      subject: string,
      message: string,
      contactEmail: string,
      userId: string | null,
    ): Promise<Complaint> {
      const row = await repo.create({ category, subject, message, contactEmail, userId })
      return toComplaint(row)
    },
    complaintReference,
  }
}

/** Instance par défaut, liée au repository partagé. */
export const complaintService = createComplaintService()
