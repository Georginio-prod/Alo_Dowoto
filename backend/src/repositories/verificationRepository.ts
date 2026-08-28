import type { PrismaClient, Verification } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données de la vérification d'identité (`prisma.verification`). Porté iso
 * depuis `server/utils/verificationStore.ts` (ADR-0016), déjà persisté en base
 * (ADR-0015). Client Prisma injecté (testable sans base). La règle de rétention
 * des images (#286) est une décision **métier** portée par le service ; ici on
 * ne fait que les accès bruts (lecture, upsert, effacement des images).
 */
export interface VerificationRepository {
  findByUserId(userId: string): Promise<Verification | null>
  /** Crée ou remplace la soumission de `userId` (repart d'un état non purgé). */
  upsert(userId: string, idCardImage: string, passportPhotoImage: string, submittedAt: Date): Promise<Verification>
  /** Efface les images et pose `purgedAt` (le statut « Vérifié » n'est jamais affecté). */
  purgeImages(userId: string): Promise<Verification>
}

export function createVerificationRepository(db: PrismaClient): VerificationRepository {
  return {
    findByUserId(userId) {
      return db.verification.findUnique({ where: { userId } })
    },
    upsert(userId, idCardImage, passportPhotoImage, submittedAt) {
      return db.verification.upsert({
        where: { userId },
        create: { userId, idCardImage, passportPhotoImage, submittedAt },
        update: { idCardImage, passportPhotoImage, submittedAt, purgedAt: null },
      })
    },
    purgeImages(userId) {
      return db.verification.update({
        where: { userId },
        data: { idCardImage: null, passportPhotoImage: null, purgedAt: new Date() },
      })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const verificationRepository = createVerificationRepository(prisma)
