import type { PrismaClient, User } from '@prisma/client'
import { prisma } from '../config/prisma'

/**
 * Accès données transverses aux comptes (`prisma.user`), réutilisé par plusieurs
 * domaines (parrainage, etc.). Client Prisma injecté (patron Phase 1). Ne porte
 * aucune logique métier ni erreur framework.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>
  /** Recherche par code de parrainage (contrôle d'unicité, #365). */
  findByReferralCode(code: string): Promise<User | null>
  /** Fixe le code de parrainage d'un compte. */
  setReferralCode(id: string, referralCode: string): Promise<void>
  /**
   * Anonymise les données personnelles d'un compte (droit à l'effacement #286).
   * L'historique financier (rattaché par `userId`) est conservé mais n'est plus
   * rattachable à une identité réelle. Iso `userStore.anonymizeUser` (partie
   * compte ; la suppression des sessions relève de `sessionRepository`).
   */
  anonymize(id: string): Promise<void>
}

export function createUserRepository(db: PrismaClient): UserRepository {
  return {
    findById(id) {
      return db.user.findUnique({ where: { id } })
    },
    findByReferralCode(code) {
      return db.user.findUnique({ where: { referralCode: code } })
    },
    async setReferralCode(id, referralCode) {
      await db.user.update({ where: { id }, data: { referralCode } })
    },
    async anonymize(id) {
      await db.user.update({
        where: { id },
        data: {
          contact: `compte-supprime-${id}@worktogo.invalid`,
          passwordHash: null,
          googleId: null,
          username: '',
          firstName: '',
          lastName: 'Compte supprimé',
          location: '',
          latitude: null,
          longitude: null,
        },
      })
    },
  }
}

/** Instance par défaut, liée au client Prisma partagé du backend. */
export const userRepository = createUserRepository(prisma)
