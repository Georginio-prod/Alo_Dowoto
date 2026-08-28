import type { User } from '@prisma/client'
import type { Request } from 'express'
import { sessionRepository } from '../repositories/sessionRepository'
import { userRepository, type NewUserProfile } from '../repositories/userRepository'
import { hasPassword } from './userService'
import { otpService } from './otpService'
import { referralService } from './referralService'
import { normalizeContact, type ContactMethod } from '../utils/contact'
import { checkPasswordStrength, hashPassword, verifyPassword } from '../utils/password'
import { isValidCoordinatePair } from '../validation/primitives'
import { badRequest, forbidden, unauthorized } from '../utils/apiError'
import type { GoogleProfile } from '../utils/googleOauth'

/** Nom du cookie de session — identique au front/Nitro (`server/utils/userStore.ts`). */
export const SESSION_COOKIE = 'wt_session'

/**
 * Durée de vie d'une session ET âge maximal du cookie « rester connecté » (30
 * jours), iso `userStore.SESSION_TTL_MS` et `SESSION_MAX_AGE_SECONDS`. Exprimée
 * en millisecondes : sert de TTL Prisma (expiresAt) et de `maxAge` du cookie
 * Express (qui, contrairement à Nitro, attend des millisecondes).
 */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Extrait le token de session d'une requête : cookie `wt_session` (site web)
 * OU en-tête `Authorization: Bearer <token>` (dashboard desktop Electron et
 * app mobile, qui n'ont pas de cookie). Iso `server/utils/requireSessionUser.ts`.
 */
export function extractSessionToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (cookieToken) return cookieToken
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return undefined
}

/**
 * Résout un token en utilisateur — iso `server/utils/userStore.ts:getSessionUser` :
 * session inconnue → `null` ; expirée → supprimée puis `null` ; compte suspendu
 * → traité comme non connecté (vérification serveur, jamais un simple masquage
 * côté client).
 */
export async function getSessionUser(token: string | undefined): Promise<User | null> {
  if (!token) return null
  const session = await sessionRepository.findByToken(token)
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await sessionRepository.deleteByToken(token)
    return null
  }
  if (session.user.status === 'suspended') return null
  return session.user
}

/** Crée une session de 30 jours et renvoie son jeton (iso `userStore.createSession`). */
export async function createSession(userId: string): Promise<string> {
  return sessionRepository.create(userId, new Date(Date.now() + SESSION_MAX_AGE_MS))
}

/** Détruit une session à partir de son jeton (au mieux). Iso `destroySession`. */
export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return
  await sessionRepository.deleteByToken(token)
}

/**
 * Retrouve un compte par contact, ou le crée à l'inscription — le rôle et le
 * profil deviennent alors obligatoires et définitifs (#19). Un code de
 * parrainage valide est lié au passage (#365), silencieusement ignoré sinon.
 * Iso `userStore.findOrCreateUser`.
 */
export async function findOrCreateUser(
  contact: string,
  role: 'client' | 'prestataire' | undefined,
  profile: NewUserProfile,
  referredByCode?: string,
): Promise<{ user: User; created: boolean }> {
  const existing = await userRepository.findByContact(contact)
  if (existing) return { user: existing, created: false }

  if (!role) {
    badRequest('Le rôle (client ou prestataire) est requis pour créer un compte.')
  }
  if (!profile.username.trim() || !profile.firstName.trim() || !profile.lastName.trim() || !profile.location.trim()) {
    badRequest("Nom d'utilisateur, prénom, nom et localisation sont requis pour créer un compte.")
  }

  const user = await userRepository.create(contact, role, profile)
  await referralService.linkReferralAtSignup(referredByCode, user.id)
  return { user, created: true }
}

/** Entrée de `POST /api/auth/session` (schéma `createSessionSchema` déjà validé). */
export interface LoginInput {
  method: ContactMethod
  value: string
  role?: 'client' | 'prestataire'
  password?: string
  username?: string
  firstName?: string
  lastName?: string
  location?: string
  latitude?: number
  longitude?: number
  referralCode?: string
}

export interface LoginResult {
  user: User
  created: boolean
  token: string
}

/**
 * Connexion/inscription (#125/#126) : consomme la preuve OTP, retrouve ou crée
 * le compte, revérifie le mot de passe d'un compte déjà finalisé, refuse un
 * compte suspendu, puis ouvre une session. Iso `server/api/auth/session.post.ts`
 * (hors pose du cookie, laissée au contrôleur). Lève 400/401/403 comme Nitro.
 */
export async function loginOrRegister(input: LoginInput): Promise<LoginResult> {
  const contact = normalizeContact(input.method, input.value)
  if (!contact) badRequest('Contact invalide.')

  if (!(await otpService.consumeVerifiedContact(contact))) {
    unauthorized("Ce contact n'a pas été vérifié par code OTP (voir /api/auth/otp/verify).")
  }

  // Coordonnées optionnelles : une paire invalide/partielle est simplement
  // ignorée plutôt que de faire échouer l'inscription (iso Nitro).
  const hasValidCoords = isValidCoordinatePair(input.latitude, input.longitude)

  const { user, created } = await findOrCreateUser(
    contact,
    input.role,
    {
      username: input.username ?? '',
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      location: input.location ?? '',
      ...(hasValidCoords ? { latitude: input.latitude, longitude: input.longitude } : {}),
    },
    input.referralCode,
  )

  // Compte existant déjà finalisé (#125) : le mot de passe est systématiquement
  // redemandé et vérifié (#126). Un compte trouvé mais pas encore finalisé
  // (passwordHash absent) reprend l'onboarding sans mot de passe.
  if (!created && hasPassword(user)) {
    const password = input.password ?? ''
    if (!password) badRequest('Mot de passe requis.')
    if (!(await verifyPassword(password, user.passwordHash ?? ''))) unauthorized('Identifiants invalides.')
  }

  // Compte suspendu par un admin : connexion refusée. Vérifié APRÈS les
  // identifiants pour ne pas révéler l'état d'un compte à qui n'en connaît pas
  // le mot de passe (iso Nitro).
  if (!created && user.suspendedAt != null) {
    forbidden('Ce compte a été suspendu. Contactez le support pour plus d’informations.')
  }

  const token = await createSession(user.id)
  return { user, created, token }
}

/** Entrée de `POST /api/auth/password` (schéma `setPasswordSchema` déjà validé). */
export interface SetPasswordInput {
  currentPassword: string
  password: string
  confirmPassword: string
}

/**
 * Crée (finalisation #125) ou change (#126) le mot de passe du compte connecté.
 * Sur un compte déjà finalisé, le mot de passe actuel est exigé et vérifié pour
 * qu'une session détournée ne verrouille pas le titulaire. Renvoie le compte à
 * jour (avec le nouveau hash) pour sa sérialisation publique. Iso `password.post.ts`.
 */
export async function setPassword(user: User, body: SetPasswordInput): Promise<User> {
  if (hasPassword(user)) {
    if (!body.currentPassword) badRequest('Le mot de passe actuel est requis.')
    if (!(await verifyPassword(body.currentPassword, user.passwordHash ?? ''))) {
      unauthorized('Mot de passe actuel incorrect.')
    }
  }

  if (body.password !== body.confirmPassword) {
    badRequest('Les mots de passe ne correspondent pas.')
  }

  const strength = checkPasswordStrength(body.password)
  if (!strength.ok) {
    badRequest(`Mot de passe trop faible : il manque ${strength.reasons.join(', ')}.`, { reasons: strength.reasons })
  }

  const passwordHash = await hashPassword(body.password)
  await userRepository.setPasswordHash(user.id, passwordHash)
  return { ...user, passwordHash }
}

/** Met à jour le profil du compte connecté (« Mon espace »). Iso `profile.patch.ts`. */
export async function updateProfile(
  userId: string,
  profile: Pick<NewUserProfile, 'username' | 'firstName' | 'lastName' | 'location'>,
): Promise<User> {
  return userRepository.updateProfile(userId, profile)
}

/** Supprime la position GPS enregistrée du compte connecté (#geoloc). Iso `position.delete.ts`. */
export async function clearPosition(userId: string): Promise<User> {
  return userRepository.clearPosition(userId)
}

/**
 * Retrouve le compte associé à un profil Google (#219) : d'abord par `googleId`
 * (connexions suivantes), sinon par email (premier login Google d'un compte créé
 * par email → liaison du `googleId`). `null` si aucun compte n'existe encore.
 * Iso le bloc de résolution de `server/api/auth/google/callback.get.ts`.
 */
export async function resolveOrLinkGoogleUser(profile: GoogleProfile): Promise<User | null> {
  let user = await userRepository.findByGoogleId(profile.googleId)
  if (!user) {
    user = await userRepository.findByContact(profile.email)
    if (user) await userRepository.linkGoogleId(user.id, profile.googleId)
  }
  return user
}
