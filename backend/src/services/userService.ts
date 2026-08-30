import type { User } from '@prisma/client'
import { userRepository, type UserRepository } from '../repositories/userRepository'
import { sessionRepository, type SessionRepository } from '../repositories/sessionRepository'
import { verificationService } from './verificationService'

/**
 * Sérialisation publique d'un compte et anonymisation (#286). Portées iso depuis
 * `server/utils/userStore.ts` (ADR-0016) : `toPublicUser` expose exactement les
 * mêmes champs (createdAt en ms epoch, latitude/longitude omis si absents,
 * `verified` dérivé de la vérification d'identité), `anonymizeUser` efface les
 * données personnelles et déconnecte toutes les sessions.
 */

/** Forme publique d'un compte — iso `PublicUser` (server/utils/userStore.ts). */
export interface PublicUser {
  id: string
  contact: string
  role: string
  createdAt: number
  passwordSet: boolean
  username: string
  firstName: string
  lastName: string
  location: string
  latitude?: number
  longitude?: number
  verified: boolean
}

/** Vrai si le compte a un mot de passe défini (iso `userStore.hasPassword`). */
export function hasPassword(user: User): boolean {
  return user.passwordHash != null
}

/**
 * Forme domaine complète d'un compte (iso `User` de `server/utils/userStore.ts`),
 * pour les vues admin (équipe, gestion de comptes). Reprend exactement la
 * projection `toUser` : champs optionnels omis quand absents, horodatages en ms.
 */
export interface AdminUserView {
  id: string
  contact: string
  role: string
  createdAt: number
  passwordHash?: string
  username: string
  firstName: string
  lastName: string
  location: string
  latitude?: number
  longitude?: number
  status: string
  suspendedAt?: number
  suspendedReason?: string
  riskFlag: boolean
  riskNote?: string
  messagingRestricted: boolean
  adminLevel?: string
}

/** Projette un compte Prisma sur la forme domaine complète (iso `userStore.toUser`). */
export function toUser(row: User): AdminUserView {
  return {
    id: row.id,
    contact: row.contact,
    role: row.role,
    createdAt: row.createdAt.getTime(),
    ...(row.passwordHash ? { passwordHash: row.passwordHash } : {}),
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    location: row.location,
    ...(row.latitude !== null ? { latitude: row.latitude } : {}),
    ...(row.longitude !== null ? { longitude: row.longitude } : {}),
    status: row.status,
    ...(row.suspendedAt ? { suspendedAt: row.suspendedAt.getTime() } : {}),
    ...(row.suspendedReason ? { suspendedReason: row.suspendedReason } : {}),
    riskFlag: row.riskFlag,
    ...(row.riskNote ? { riskNote: row.riskNote } : {}),
    messagingRestricted: row.messagingRestricted,
    ...(row.adminLevel ? { adminLevel: row.adminLevel } : {}),
  }
}

export function createUserService(
  users: UserRepository = userRepository,
  sessions: SessionRepository = sessionRepository,
  verification = verificationService,
) {
  return {
    /** Projette un compte Prisma sur sa forme publique (iso `toPublicUser`). */
    async toPublicUser(user: User): Promise<PublicUser> {
      return {
        id: user.id,
        contact: user.contact,
        role: user.role,
        createdAt: user.createdAt.getTime(),
        passwordSet: hasPassword(user),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        location: user.location,
        ...(user.latitude !== null ? { latitude: user.latitude } : {}),
        ...(user.longitude !== null ? { longitude: user.longitude } : {}),
        verified: await verification.isVerified(user.id),
      }
    },

    /** Anonymise le compte puis supprime ses sessions (iso `anonymizeUser`). */
    async anonymizeUser(userId: string): Promise<void> {
      await users.anonymize(userId)
      await sessions.deleteByUser(userId)
    },
  }
}

/** Instance par défaut, liée aux repositories partagés. */
export const userService = createUserService()
