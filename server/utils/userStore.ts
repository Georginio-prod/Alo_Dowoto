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

/**
 * Rôle stocké en base pour un compte : le rôle d'inscription publique
 * (`Role`) plus `admin`, réservé au dashboard d'administration et jamais
 * attribué via l'inscription (voir scripts/create-admin.mjs). Volontairement
 * NON injecté dans l'interface `User` (dont le champ `role` reste `Role`) :
 * l'élargir propagerait `admin` aux types dérivés des messages et témoignages,
 * auxquels un admin ne participe jamais. Le code d'administration compare donc
 * `user.role` à `'admin'` via un cast local (server/utils/requireAdminRole.ts).
 */
export type AccountRole = Role | 'admin'

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
  /** Coordonnées GPS réelles, capturées en option via la géolocalisation du navigateur à l'inscription. */
  latitude?: number
  longitude?: number
}

export interface NewUserProfile {
  username: string
  firstName: string
  lastName: string
  location: string
  latitude?: number
  longitude?: number
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
    ...(row.latitude !== null ? { latitude: row.latitude } : {}),
    ...(row.longitude !== null ? { longitude: row.longitude } : {}),
  }
}

/**
 * Retrouve l'utilisateur associé à un contact, ou en crée un nouveau (le
 * rôle est alors obligatoire et définitif — voir #19). `profile` est
 * obligatoire à la création : le nom d'utilisateur, le prénom, le nom et la
 * localisation sont collectés dès la première page d'inscription, pour les
 * deux types de compte.
 *
 * `referredByCode` (#365, programme de parrainage) : code de parrainage
 * saisi à l'inscription, ignoré silencieusement s'il est absent ou invalide
 * (un code erroné ne doit jamais bloquer une inscription) — la logique de
 * résolution/liaison vit dans referralStore.ts, pas ici, pour garder ce
 * store concentré sur les comptes.
 */
export async function findOrCreateUser(
  contact: string,
  role: Role | undefined,
  profile?: NewUserProfile,
  referredByCode?: string,
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
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
    },
  })
  const user = toUser(row)

  if (referredByCode) {
    const referrerId = await findUserIdByReferralCode(referredByCode)
    if (referrerId) await createReferral(referrerId, user.id)
  }

  return { user, created: true }
}

/** Retrouve un utilisateur par id (ex. utilisé par la messagerie, #59). */
export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } })
  return row ? toUser(row) : null
}

/**
 * `true` si le compte a été suspendu par un administrateur (#admin dashboard,
 * champ User.suspendedAt). Sert à refuser TOUTE création de session : login
 * OTP/mot de passe (server/api/auth/session.post.ts) ET « Continuer avec
 * Google » (server/api/auth/google/callback.get.ts) — la suspension supprime
 * par ailleurs les sessions actives (server/api/admin/users/[id]/suspend.post.ts).
 */
export async function isSuspended(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } })
  return row?.suspendedAt != null
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

/**
 * Supprime la position GPS enregistrée d'un utilisateur (#geoloc, partie 3 —
 * vie privée) : action distincte de `updateUserProfile`, qui ne touche
 * jamais aux coordonnées, pour que « supprimer ma position » reste un geste
 * explicite et irréversible (pas un simple champ vide oublié dans un
 * formulaire). `location` (ville en texte libre) n'est volontairement pas
 * effacée : ce n'est pas une donnée de géolocalisation précise.
 */
export async function clearUserPosition(userId: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) notFound('Utilisateur introuvable.')
  const row = await prisma.user.update({ where: { id: userId }, data: { latitude: null, longitude: null } })
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

/**
 * Droit à l'effacement (#286, RGPD/audit sécurité) : anonymise les données
 * personnelles du compte plutôt que de supprimer la ligne — l'historique
 * financier (`Payment`, `Subscription`, réservé par leur clé étrangère
 * `userId`) doit être conservé pour les obligations légales comptables et
 * fiscales, comme l'indique déjà la politique de confidentialité
 * (« Durée de conservation »). Toute session active est invalidée pour que
 * le compte anonymisé ne puisse plus être réutilisé. `contact` est unique
 * en base : le placeholder intègre l'id pour ne jamais entrer en collision
 * entre deux comptes supprimés.
 */
export async function anonymizeUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      contact: `compte-supprime-${userId}@worktogo.invalid`,
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
  await prisma.session.deleteMany({ where: { userId } })
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
  latitude?: number
  longitude?: number
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
    ...(user.latitude !== undefined ? { latitude: user.latitude } : {}),
    ...(user.longitude !== undefined ? { longitude: user.longitude } : {}),
    verified: isVerified(user.id),
  }
}
