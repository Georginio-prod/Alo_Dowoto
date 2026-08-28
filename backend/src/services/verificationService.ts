import type { Verification as PrismaVerification } from '@prisma/client'
import { verificationRepository, type VerificationRepository } from '../repositories/verificationRepository'

/**
 * Vérification d'identité (#180+1). Logique **portée iso** depuis
 * `server/utils/verificationStore.ts` (ADR-0016) : auto-certification à la
 * soumission des deux pièces, et minimisation des données (#286) — les images
 * sont effacées passé le délai de rétention, sans jamais revenir sur le statut
 * « Vérifié » déjà acquis.
 */

/** Durée de conservation des images de pièce d'identité après vérification (#286) : 90 jours. */
export const ID_DOCUMENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

/** Vue métier (horodatages en epoch ms, iso à l'ancien store en mémoire). */
export interface VerificationView {
  userId: string
  idCardImage: string | null
  passportPhotoImage: string | null
  submittedAt: number
  purgedAt: number | null
}

function toView(row: PrismaVerification): VerificationView {
  return {
    userId: row.userId,
    idCardImage: row.idCardImage,
    passportPhotoImage: row.passportPhotoImage,
    submittedAt: row.submittedAt.getTime(),
    purgedAt: row.purgedAt?.getTime() ?? null,
  }
}

export function createVerificationService(repo: VerificationRepository = verificationRepository) {
  /**
   * Efface les images d'une soumission dont le délai de conservation est dépassé
   * (le statut « Vérifié » n'est jamais affecté). No-op si déjà purgée ou encore
   * dans le délai.
   */
  async function applyRetentionPurge(row: PrismaVerification): Promise<PrismaVerification> {
    if (row.purgedAt !== null) return row
    if (Date.now() - row.submittedAt.getTime() < ID_DOCUMENT_RETENTION_MS) return row
    return repo.purgeImages(row.userId)
  }

  return {
    /** Statut de vérification du compte (`null` si jamais soumis). */
    async getVerification(userId: string): Promise<VerificationView | null> {
      const row = await repo.findByUserId(userId)
      if (!row) return null
      return toView(await applyRetentionPurge(row))
    },

    /** Indique si le compte est certifié (existence d'une soumission). */
    async isVerified(userId: string): Promise<boolean> {
      return repo.existsForUser(userId)
    },

    /** Effacement complet à la demande (#286). `true` si une soumission existait. */
    async deleteVerification(userId: string): Promise<boolean> {
      return repo.deleteByUser(userId)
    },

    /** Soumet (ou remplace) les deux pièces : certifie immédiatement le compte. */
    async submitVerification(userId: string, idCardImage: string, passportPhotoImage: string): Promise<VerificationView> {
      // `submittedAt` posé côté JS (et non via le défaut base) pour rester
      // cohérent avec la comparaison de rétention (`Date.now()`), y compris quand
      // un test fige l'horloge. Iso `verificationStore.submitVerification`.
      const submittedAt = new Date(Date.now())
      const row = await repo.upsert(userId, idCardImage, passportPhotoImage, submittedAt)
      return toView(row)
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const verificationService = createVerificationService()
