import type { Complaint, PrismaClient } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des réclamations (`prisma.complaint`). Porté iso depuis
 * `server/utils/complaintStore.ts` (ADR-0016). Client Prisma injecté (patron
 * Phase 1) — aucune logique métier ici (la référence de suivi et la résolution
 * de session appartiennent au service/controller). Les champs de suivi support
 * (`status`, `adminNote`…) gardent leurs défauts : la page publique ne les lit
 * jamais.
 */
export interface ComplaintRepository {
  create(data: {
    category: string
    subject: string
    message: string
    contactEmail: string
    userId: string | null
  }): Promise<Complaint>
}

export function createComplaintRepository(db: PrismaClient): ComplaintRepository {
  return {
    create(data) {
      return db.complaint.create({
        data: { ...data, createdAt: new Date(Date.now()) },
      })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const complaintRepository = createComplaintRepository(prisma)
