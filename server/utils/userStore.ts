import { randomUUID } from 'node:crypto'
import type { User as PrismaUser } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { isVerified } from '~~/server/utils/verificationStore'

/**
 * Persistance des utilisateurs et des sessions en base (Prisma/SQLite,
 * #218) : contrairement aux anciens stores en mémoire, comptes et sessions
 * survivent aux redémarrages du serveur.
 */

export type Role = 'client' | 'prestataire'

export interface User {
  id: string
  contact: string
  role: Role
  createdAt: number
  /** Hash scrypt (server/utils/password.ts) — absent tant que #125 n'est pas complétée. */
  passwordHash?: string
  /** Collectés dès la première page d'inscription, pour chercheur et prestataire. */
  username: string
  firstName: string
  lastName: string
  location: string
}

export interface NewUserProfile {
  username: string
  firstName: string
  lastName: string
  location: string
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'wt_session'

function toUser(row: PrismaUser): User {
  return {
    id: row.id,
    contact: row.contact,
    role: row.role as Role,
    createdAt: row.createdAt.getTime(),
    ...(row.passwordHash ? { passwordHash: row.passwordHash } : {}),
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    location: row.location,
  }
}

/**
 * Retrouve l'utilisateur associé à un contact, ou en crée un nouveau (le
 * rôle est alors obligatoire et définitif — voir #19). `profile` est
 * obligatoire à la création : le nom d'utilisateur, le prénom, le nom et la
 * localisation sont collectés dès la première page d'inscription, pour les
 * deux types de compte.
 */
export async function findOrCreateUser(
  contact: string,
  role: Role | undefined,
  profile?: NewUserProfile,
): Promise<{ user: User; created: boolean }> {
  const existing = await prisma.user.findUnique({ where: { contact } })
  if (existing) return { user: toUser(existing), created: false }

  if (!role) {
    badRequest('Le rôle (client ou prestataire) est requis pour créer un compte.')
  }
  if (!profile) {
    badRequest("Nom d'utilisateur, prénom, nom et localisation sont requis pour créer un compte.")
  }
  if (!profile.username.trim() || !profile.firstName.trim() || !profile.lastName.trim() || !profile.location.trim()) {
    badRequest("Nom d'utilisateur, prénom, nom et localisation sont requis pour créer un compte.")
  }

  const row = await prisma.user.create({
    data: {
      contact,
      role,
      username: profile.username.trim(),
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      location: profile.location.trim(),
    },
  })
  return { user: toUser(row), created: true }
}

/** Retrouve un utilisateur par id (ex. utilisé par la messagerie, #59). */
export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } })
  return row ? toUser(row) : null
}

/** Retrouve un utilisateur par contact normalisé (connexion Google, #219). */
export async function getUserByContact(contact: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { contact } })
  return row ? toUser(row) : null
}

/** Retrouve un utilisateur par identifiant Google (`sub` OpenID Connect, #219). */
export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { googleId } })
  return row ? toUser(row) : null
}

/**
 * Lie un compte Google à un compte existant (#219) — appelé au premier
 * login Google d'un compte créé par email, pour retrouver le compte par
 * `googleId` aux connexions suivantes même si l'email Google change.
 */
export async function linkGoogleId(userId: string, googleId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { googleId } })
}

/** Met à jour les informations de profil (nom d'utilisateur, prénom, nom, localisation) d'un compte existant. */
export async function updateUserProfile(userId: string, profile: NewUserProfile): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) notFound('Utilisateur introuvable.')
  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      location: profile.location,
    },
  })
  return toUser(row)
}

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID()
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return token
}

export async function getSessionUser(token: string | undefined): Promise<User | null> {
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => {})
    return null
  }
  return toUser(session.user)
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return
  await prisma.session.deleteMany({ where: { token } })
}

/**
 * Le compte n'est considéré comme finalisé qu'une fois un mot de passe
 * défini (#125) — étape obligatoire juste après la vérification OTP.
 */
export function hasPassword(user: User): boolean {
  return !!user.passwordHash
}

export async function setPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { passwordHash } })
}

export interface PublicUser {
  id: string
  contact: string
  role: Role
  createdAt: number
  passwordSet: boolean
  username: string
  firstName: string
  lastName: string
  location: string
  /** Identité vérifiée (carte d'identité + photo passeport, voir server/utils/verificationStore.ts). */
  verified: boolean
}

/** Vue publique d'un utilisateur : ne jamais exposer `passwordHash` au client. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    contact: user.contact,
    role: user.role,
    createdAt: user.createdAt,
    passwordSet: hasPassword(user),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    location: user.location,
    verified: isVerified(user.id),
  }
}
