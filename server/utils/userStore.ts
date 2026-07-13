import { randomUUID } from 'node:crypto'

/**
 * Store en mémoire pour les utilisateurs et les sessions. Suffisant pour ce
 * lot (pas de base de données encore en place, voir #45/#46) mais ne
 * survit pas à un redémarrage ni à plusieurs instances du serveur.
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

interface Session {
  userId: string
  expiresAt: number
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'wt_session'

const usersByContact = new Map<string, User>()
const sessions = new Map<string, Session>()

/**
 * Retrouve l'utilisateur associé à un contact, ou en crée un nouveau (le
 * rôle est alors obligatoire et définitif — voir #19). `profile` est
 * obligatoire à la création : le nom d'utilisateur, le prénom, le nom et la
 * localisation sont collectés dès la première page d'inscription, pour les
 * deux types de compte.
 */
export function findOrCreateUser(
  contact: string,
  role: Role | undefined,
  profile?: NewUserProfile,
): { user: User; created: boolean } {
  const existing = usersByContact.get(contact)
  if (existing) return { user: existing, created: false }

  if (!role) {
    badRequest('Le rôle (client ou prestataire) est requis pour créer un compte.')
  }
  if (!profile) {
    badRequest("Nom d'utilisateur, prénom, nom et localisation sont requis pour créer un compte.")
  }
  if (!profile.username.trim() || !profile.firstName.trim() || !profile.lastName.trim() || !profile.location.trim()) {
    badRequest("Nom d'utilisateur, prénom, nom et localisation sont requis pour créer un compte.")
  }

  const user: User = {
    id: randomUUID(),
    contact,
    role,
    createdAt: Date.now(),
    username: profile.username.trim(),
    firstName: profile.firstName.trim(),
    lastName: profile.lastName.trim(),
    location: profile.location.trim(),
  }
  usersByContact.set(contact, user)
  return { user, created: true }
}

/** Retrouve un utilisateur par id (ex. utilisé par la messagerie, #59). */
export function getUserById(id: string): User | null {
  for (const user of usersByContact.values()) {
    if (user.id === id) return user
  }
  return null
}

export function createSession(userId: string): string {
  const token = randomUUID()
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS })
  return token
}

export function getSessionUser(token: string | undefined): User | null {
  if (!token) return null
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  for (const user of usersByContact.values()) {
    if (user.id === session.userId) return user
  }
  return null
}

export function destroySession(token: string | undefined) {
  if (token) sessions.delete(token)
}

/**
 * Le compte n'est considéré comme finalisé qu'une fois un mot de passe
 * défini (#125) — étape obligatoire juste après la vérification OTP.
 */
export function hasPassword(user: User): boolean {
  return !!user.passwordHash
}

export function setPasswordHash(userId: string, passwordHash: string): void {
  const user = getUserById(userId)
  if (!user) return
  user.passwordHash = passwordHash
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
  }
}
