import type { Complaint as PrismaComplaint } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import type { ComplaintCategory } from '~/data/complaintCategories'

/**
 * Réclamations déposées depuis /reclamation (#357), persistées en base
 * (Prisma/SQLite, ADR 0013). Contrairement à l'ancien store en mémoire, les
 * réclamations survivent aux redémarrages du serveur.
 *
 * La liste des catégories (COMPLAINT_CATEGORY_VALUES, getComplaintCategories)
 * vit dans app/data/complaintCategories.ts, pas ici.
 */

export type { ComplaintCategory }

export interface Complaint {
  id: string
  category: ComplaintCategory
  subject: string
  message: string
  /** Email de contact pour le suivi — pré-rempli depuis le compte si connecté, sinon fourni par l'utilisateur (#129). */
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

export async function addComplaint(
  category: ComplaintCategory,
  subject: string,
  message: string,
  contactEmail: string,
  userId: string | null,
): Promise<Complaint> {
  const row = await prisma.complaint.create({
    data: { category, subject, message, contactEmail, userId, createdAt: new Date(Date.now()) },
  })
  return toComplaint(row)
}

export async function listComplaints(): Promise<Complaint[]> {
  const rows = await prisma.complaint.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(toComplaint)
}

/** Référence courte et lisible affichée à l'utilisateur pour le suivi de sa réclamation. */
export function complaintReference(complaint: Complaint): string {
  return `REF-${complaint.id.slice(0, 8).toUpperCase()}`
}
