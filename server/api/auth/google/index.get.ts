import { randomUUID } from 'node:crypto'

/**
 * Point de départ du parcours « Continuer avec Google » (#219) : pose le
 * `state` anti-CSRF en cookie, mémorise le rôle d'inscription souhaité le
 * cas échéant, puis redirige vers l'écran de consentement Google.
 */
export default defineEventHandler((event) => {
  const config = googleOauthConfig()
  if (!config) {
    // Identifiants absents (voir .env.example) : on revient sur /auth avec
    // une erreur explicite plutôt que d'échouer en silence.
    return sendRedirect(event, '/auth?error=google_config')
  }

  const state = randomUUID()
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  }
  setCookie(event, GOOGLE_STATE_COOKIE, state, cookieOptions)

  // Rôle choisi sur l'onglet Inscription — repris au retour du callback
  // pour présélectionner le bon parcours si le compte n'existe pas encore.
  const role = getQuery(event).role
  if (role === 'client' || role === 'prestataire') {
    setCookie(event, GOOGLE_ROLE_COOKIE, role, cookieOptions)
  } else {
    deleteCookie(event, GOOGLE_ROLE_COOKIE, { path: '/' })
  }

  const redirectUri = `${getRequestURL(event).origin}/api/auth/google/callback`
  return sendRedirect(event, buildGoogleAuthUrl(config.clientId, redirectUri, state))
})
