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
 * rôle est alors obligatoire et définitif — voir #19).
 */
export function findOrCreateUser(contact: string, role: Role | undefined): { user: User; created: boolean } {
  const existing = usersByContact.get(contact)
  if (existing) return { user: existing, created: false }

  if (!role) {
    badRequest('Le rôle (client ou prestataire) est requis pour créer un compte.')
  }

  const user: User = { id: randomUUID(), contact, role, createdAt: Date.now() }
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
