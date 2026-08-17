import { isSuspended } from '~~/server/utils/userStore'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Retour de l'écran de consentement Google (#219).
 *
 * - Compte existant (retrouvé par `googleId`, sinon par email — auquel cas
 *   le `googleId` est lié au passage) : session créée directement, sans mot
 *   de passe ni OTP — l'identité est prouvée par Google.
 * - Aucun compte : l'email est marqué vérifié (équivalent OTP) et le profil
 *   Google est gardé dans un cookie httpOnly de courte durée (pas de PII
 *   dans l'URL) ; /auth reprend alors l'inscription préremplie (rôle, nom
 *   d'utilisateur, localisation, mot de passe restent à compléter).
 *
 * Tous les échecs redirigent vers /auth?error=google_* — voir la
 * correspondance des messages dans app/pages/auth.vue.
 */
export default defineEventHandler(async (event) => {
  const config = googleOauthConfig()
  if (!config) {
    return sendRedirect(event, '/auth?error=google_config')
  }

  const query = getQuery(event)
  const stateCookie = getCookie(event, GOOGLE_STATE_COOKIE)
  const roleCookie = getCookie(event, GOOGLE_ROLE_COOKIE)
  deleteCookie(event, GOOGLE_STATE_COOKIE, { path: '/' })
  deleteCookie(event, GOOGLE_ROLE_COOKIE, { path: '/' })

  // L'utilisateur a refusé le consentement (ou Google renvoie une erreur).
  if (typeof query.error === 'string' && query.error) {
    return sendRedirect(event, '/auth?error=google_denied')
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return sendRedirect(event, '/auth?error=google_state')
  }

  const redirectUri = `${getRequestURL(event).origin}/api/auth/google/callback`
  const profile = await fetchGoogleProfile(config, code, redirectUri)
  if (!profile) {
    return sendRedirect(event, '/auth?error=google_failed')
  }
  if (!profile.emailVerified) {
    return sendRedirect(event, '/auth?error=google_email')
  }

  // Compte existant : d'abord par googleId (connexions suivantes), sinon
  // par email (premier login Google d'un compte créé par email → liaison).
  let user = await getUserByGoogleId(profile.googleId)
  if (!user) {
    user = await getUserByContact(profile.email)
    if (user) {
      await linkGoogleId(user.id, profile.googleId)
    }
  }

  if (user) {
    // Compte suspendu par un administrateur (#admin) : la connexion Google est
    // refusée au même titre que le login OTP/mot de passe (voir session.post.ts).
    if (await isSuspended(user.id)) {
      return sendRedirect(event, '/auth?error=google_suspended')
    }
    const token = await createSession(user.id)
    setCookie(event, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })
    return sendRedirect(event, user.role === 'prestataire' ? '/prestataire' : '/resultats')
  }

  // Nouveau compte : le front finalise l'inscription (rôle, profil, mot de
  // passe) — l'email vérifié par Google remplace l'étape OTP.
  await markContactVerified(profile.email)
  setCookie(
    event,
    GOOGLE_SIGNUP_COOKIE,
    JSON.stringify({ email: profile.email, firstName: profile.firstName, lastName: profile.lastName }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60,
      path: '/',
    },
  )
  const roleQuery = roleCookie === 'client' || roleCookie === 'prestataire' ? `&role=${roleCookie}` : ''
  return sendRedirect(event, `/auth?google=1${roleQuery}`)
})
