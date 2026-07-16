/**
 * Intégration « Continuer avec Google » (OAuth 2.0 / OpenID Connect, #219).
 *
 * Le flux est le flux « authorization code » classique :
 *   /api/auth/google           → redirection vers Google (state anti-CSRF)
 *   /api/auth/google/callback  → échange du code, lecture du profil, session
 *
 * La configuration vient de GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (voir
 * .env.example). Sans configuration, le parcours renvoie une erreur
 * explicite (`/auth?error=google_config`) plutôt que d'échouer en silence.
 */

export const GOOGLE_STATE_COOKIE = 'wt_oauth_state'
export const GOOGLE_ROLE_COOKIE = 'wt_oauth_role'
export const GOOGLE_SIGNUP_COOKIE = 'wt_google_signup'

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export interface GoogleOauthConfig {
  clientId: string
  clientSecret: string
}

export function googleOauthConfig(): GoogleOauthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

/** URL d'autorisation Google — extraite pour être testable unitairement. */
export function buildGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // `select_account` évite la reconnexion silencieuse au mauvais compte
    // quand plusieurs comptes Google sont ouverts dans le navigateur.
    prompt: 'select_account',
  })
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

export interface GoogleProfile {
  /** Identifiant OpenID Connect stable du compte Google (`sub`). */
  googleId: string
  email: string
  emailVerified: boolean
  firstName: string
  lastName: string
}

interface GoogleUserInfoResponse {
  sub?: string
  email?: string
  email_verified?: boolean
  given_name?: string
  family_name?: string
}

/** Mapping userinfo Google → profil interne — extrait pour être testable. */
export function toGoogleProfile(info: GoogleUserInfoResponse): GoogleProfile | null {
  if (!info.sub || !info.email) return null
  return {
    googleId: info.sub,
    email: info.email.trim().toLowerCase(),
    emailVerified: info.email_verified === true,
    firstName: info.given_name?.trim() ?? '',
    lastName: info.family_name?.trim() ?? '',
  }
}

/**
 * Échange le code d'autorisation contre un jeton d'accès puis récupère le
 * profil Google. Retourne null si l'échange ou la lecture du profil échoue
 * (code expiré, configuration invalide…) — l'appelant redirige alors vers
 * /auth?error=google_failed.
 */
export async function fetchGoogleProfile(
  config: GoogleOauthConfig,
  code: string,
  redirectUri: string,
): Promise<GoogleProfile | null> {
  try {
    const tokens = await $fetch<{ access_token?: string }>(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
    if (!tokens.access_token) return null

    const info = await $fetch<GoogleUserInfoResponse>(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    return toGoogleProfile(info)
  } catch {
    return null
  }
}
