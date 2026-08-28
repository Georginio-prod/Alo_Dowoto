import type { OtpCode, PrismaClient, VerifiedContact } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données des codes OTP et des preuves de vérification de contact
 * (`prisma.otpCode`, `prisma.verifiedContact`). Porté iso depuis
 * `server/utils/otpStore.ts` (ADR-0016). Client Prisma injecté (patron Phase 1) :
 * aucune logique métier (TTL, cooldown, tentatives) — elle vit dans `otpService`.
 */
export interface OtpRepository {
  findCode(contact: string): Promise<OtpCode | null>
  /** Crée ou remplace le code d'un contact (renvoi d'un nouveau code). */
  upsertCode(contact: string, code: string, expiresAt: Date, lastSentAt: Date): Promise<void>
  /** Incrémente le compteur de tentatives (code erroné saisi). */
  incrementAttempts(contact: string): Promise<void>
  /** Supprime le code d'un contact (au mieux : une absence n'est pas une erreur). */
  deleteCode(contact: string): Promise<void>

  findVerifiedContact(contact: string): Promise<VerifiedContact | null>
  /** Marque (ou prolonge) un contact comme vérifié jusqu'à `expiresAt`. */
  upsertVerifiedContact(contact: string, expiresAt: Date): Promise<void>
  /** Consomme la preuve de vérification (au mieux). */
  deleteVerifiedContact(contact: string): Promise<void>
}

export function createOtpRepository(db: PrismaClient): OtpRepository {
  return {
    findCode(contact) {
      return db.otpCode.findUnique({ where: { contact } })
    },
    async upsertCode(contact, code, expiresAt, lastSentAt) {
      const data = { code, expiresAt, attempts: 0, lastSentAt }
      await db.otpCode.upsert({ where: { contact }, create: { contact, ...data }, update: data })
    },
    async incrementAttempts(contact) {
      await db.otpCode.update({ where: { contact }, data: { attempts: { increment: 1 } } })
    },
    async deleteCode(contact) {
      await db.otpCode.deleteMany({ where: { contact } })
    },

    findVerifiedContact(contact) {
      return db.verifiedContact.findUnique({ where: { contact } })
    },
    async upsertVerifiedContact(contact, expiresAt) {
      await db.verifiedContact.upsert({
        where: { contact },
        create: { contact, expiresAt },
        update: { expiresAt },
      })
    },
    async deleteVerifiedContact(contact) {
      await db.verifiedContact.deleteMany({ where: { contact } })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const otpRepository = createOtpRepository(prisma)
