import { randomUUID } from 'node:crypto'
import type { CookieOptions, Request, Response } from 'express'
import { env } from '../config/env'
import { authUser } from '../utils/authUser'
import { userService } from '../services/userService'
import { otpService } from '../services/otpService'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  clearPosition,
  createSession,
  destroySession,
  loginOrRegister,
  resolveOrLinkGoogleUser,
  setPassword,
  updateProfile,
} from '../services/authService'
import {
  GOOGLE_ROLE_COOKIE,
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_STATE_COOKIE,
  buildGoogleAuthUrl,
  fetchGoogleProfile,
  googleOauthConfig,
} from '../utils/googleOauth'
import type { createSessionSchema, sendOtpSchema, setPasswordSchema, updateProfileSchema, verifyOtpSchema } from '../validation/schemas/auth'
import type { z } from 'zod'

/**
 * Handlers d'authentification (#23/#125/#126/#219), portés iso depuis
 * `server/api/auth/**` (ADR-0016). Sessions, OTP, mot de passe, profil, position
 * et « Continuer avec Google ». Les gardes (`requireSessionUser`) sont montées
 * sur les routes ; la pose/suppression des cookies vit ici (côté HTTP), la
 * logique métier dans `authService`/`otpService`.
 */

/** Options communes des cookies httpOnly (secure seulement en production). */
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  path: '/',
}

/** Origine de la requête (`https://host`) — pour construire le `redirect_uri` Google. */
function requestOrigin(req: Request): string {
  return `${req.protocol}://${req.get('host')}`
}

// --- Sessions --------------------------------------------------------------

/** GET /api/auth/session → { user } du compte connecté. */
export async function getSession(req: Request, res: Response): Promise<void> {
  res.json({ user: await userService.toPublicUser(authUser(req)) })
}

/** POST /api/auth/session → connexion/inscription : ouvre une session (cookie). */
export async function createSessionHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createSessionSchema>
  const { user, created, token } = await loginOrRegister(body)

  res.cookie(SESSION_COOKIE, token, {
    ...baseCookieOptions,
    // `rememberMe: false` → cookie de session (sans maxAge) ; sinon 30 jours.
    ...(body.rememberMe === false ? {} : { maxAge: SESSION_MAX_AGE_MS }),
  })

  res.status(created ? 201 : 200).json({ user: await userService.toPublicUser(user), created })
}

/** DELETE /api/auth/session → déconnexion : détruit la session et efface le cookie. */
export async function deleteSession(req: Request, res: Response): Promise<void> {
  await destroySession(req.cookies?.[SESSION_COOKIE] as string | undefined)
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
}

// --- OTP -------------------------------------------------------------------

/** POST /api/auth/otp/send → envoie un code de vérification (SMS/email). */
export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { method, value } = req.body as z.infer<typeof sendOtpSchema>
  res.json(await otpService.requestOtp(method, value))
}

/** POST /api/auth/otp/verify → vérifie le code et dépose la preuve de vérification. */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { method, value, code } = req.body as z.infer<typeof verifyOtpSchema>
  res.json(await otpService.confirmOtp(method, value, code))
}

// --- Mot de passe / profil / position --------------------------------------

/** POST /api/auth/password → crée (finalisation) ou change le mot de passe. */
export async function setPasswordHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof setPasswordSchema>
  const updated = await setPassword(authUser(req), body)
  res.json({ user: await userService.toPublicUser(updated) })
}

/** PATCH /api/auth/profile → met à jour le profil du compte connecté. */
export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateProfileSchema>
  const updated = await updateProfile(authUser(req).id, body)
  res.json({ user: await userService.toPublicUser(updated) })
}

/** DELETE /api/auth/position → supprime la position GPS enregistrée. */
export async function deletePosition(req: Request, res: Response): Promise<void> {
  const updated = await clearPosition(authUser(req).id)
  res.json({ user: await userService.toPublicUser(updated) })
}

// --- Google OAuth (#219) ---------------------------------------------------

/** GET /api/auth/google → pose le state anti-CSRF puis redirige vers Google. */
export function googleStart(req: Request, res: Response): void {
  const config = googleOauthConfig()
  if (!config) {
    res.redirect('/auth?error=google_config')
    return
  }

  const state = randomUUID()
  const cookieOptions: CookieOptions = { ...baseCookieOptions, maxAge: 10 * 60 * 1000 }
  res.cookie(GOOGLE_STATE_COOKIE, state, cookieOptions)

  // Rôle choisi sur l'onglet Inscription — repris au retour du callback.
  const role = req.query.role
  if (role === 'client' || role === 'prestataire') {
    res.cookie(GOOGLE_ROLE_COOKIE, role, cookieOptions)
  } else {
    res.clearCookie(GOOGLE_ROLE_COOKIE, { path: '/' })
  }

  const redirectUri = `${requestOrigin(req)}/api/auth/google/callback`
  res.redirect(buildGoogleAuthUrl(config.clientId, redirectUri, state))
}

/** GET /api/auth/google/callback → échange le code, ouvre la session ou reprend l'inscription. */
export async function googleCallback(req: Request, res: Response): Promise<void> {
  const config = googleOauthConfig()
  if (!config) {
    res.redirect('/auth?error=google_config')
    return
  }

  const stateCookie = req.cookies?.[GOOGLE_STATE_COOKIE] as string | undefined
  const roleCookie = req.cookies?.[GOOGLE_ROLE_COOKIE] as string | undefined
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: '/' })
  res.clearCookie(GOOGLE_ROLE_COOKIE, { path: '/' })

  // L'utilisateur a refusé le consentement (ou Google renvoie une erreur).
  if (typeof req.query.error === 'string' && req.query.error) {
    res.redirect('/auth?error=google_denied')
    return
  }

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code || !state || !stateCookie || state !== stateCookie) {
    res.redirect('/auth?error=google_state')
    return
  }

  const redirectUri = `${requestOrigin(req)}/api/auth/google/callback`
  const profile = await fetchGoogleProfile(config, code, redirectUri)
  if (!profile) {
    res.redirect('/auth?error=google_failed')
    return
  }
  if (!profile.emailVerified) {
    res.redirect('/auth?error=google_email')
    return
  }

  const user = await resolveOrLinkGoogleUser(profile)

  if (user) {
    // Compte suspendu par un admin : connexion Google refusée (iso session.post).
    if (user.suspendedAt != null) {
      res.redirect('/auth?error=google_suspended')
      return
    }
    const token = await createSession(user.id)
    res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions, maxAge: SESSION_MAX_AGE_MS })
    res.redirect(user.role === 'prestataire' ? '/prestataire' : '/resultats')
    return
  }

  // Nouveau compte : le front finalise l'inscription (rôle, profil, mot de
  // passe) — l'email vérifié par Google remplace l'étape OTP.
  await otpService.markContactVerified(profile.email)
  res.cookie(
    GOOGLE_SIGNUP_COOKIE,
    JSON.stringify({ email: profile.email, firstName: profile.firstName, lastName: profile.lastName }),
    { ...baseCookieOptions, maxAge: 15 * 60 * 1000 },
  )
  const roleQuery = roleCookie === 'client' || roleCookie === 'prestataire' ? `&role=${roleCookie}` : ''
  res.redirect(`/auth?google=1${roleQuery}`)
}

interface PendingGoogleSignup {
  email: string
  firstName: string
  lastName: string
}

/** GET /api/auth/google/pending → profil Google en attente d'inscription (cookie httpOnly). */
export function googlePending(req: Request, res: Response): void {
  const raw = req.cookies?.[GOOGLE_SIGNUP_COOKIE] as string | undefined
  if (!raw) {
    res.json({ pending: null })
    return
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PendingGoogleSignup>
    if (!parsed.email) {
      res.json({ pending: null })
      return
    }
    res.json({
      pending: { email: parsed.email, firstName: parsed.firstName ?? '', lastName: parsed.lastName ?? '' },
    })
  } catch {
    res.json({ pending: null })
  }
}
