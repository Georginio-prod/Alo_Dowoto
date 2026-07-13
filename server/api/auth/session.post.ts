import type { ContactMethod } from '~~/server/utils/contact'
import type { Role } from '~~/server/utils/userStore'

interface CreateSessionBody {
  method?: ContactMethod
  value?: string
  role?: Role
  /** Obligatoire pour se connecter à un compte existant déjà finalisé (#126). */
  password?: string
  /** Session persistante (30 jours) vs. session de navigateur (#126, "Se souvenir de moi"). */
  rememberMe?: boolean
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateSessionBody>(event)

  if (body?.method !== 'phone' && body?.method !== 'email') {
    badRequest('Méthode de contact invalide.')
  }

  const contact = normalizeContact(body.method, body.value ?? '')
  if (!contact) {
    badRequest('Contact invalide.')
  }

  if (!consumeVerifiedContact(contact)) {
    unauthorized("Ce contact n'a pas été vérifié par code OTP (voir /api/auth/otp/verify).")
  }

  const role = body.role === 'client' || body.role === 'prestataire' ? body.role : undefined
  const { user, created } = findOrCreateUser(contact, role)

  // Compte existant déjà finalisé : le mot de passe créé à l'inscription
  // (#125) est systématiquement redemandé et vérifié (#126). Un compte
  // trouvé mais pas encore finalisé (passwordHash absent, inscription
  // interrompue) est traité comme la suite d'un onboarding : la session est
  // créée sans mot de passe pour laisser le front reprendre l'étape #125.
  if (!created && hasPassword(user)) {
    const password = body.password ?? ''
    if (!password) {
      badRequest('Mot de passe requis.')
    }
    const valid = await verifyPassword(password, user.passwordHash ?? '')
    if (!valid) {
      unauthorized('Identifiants invalides.')
    }
  }

  const token = createSession(user.id)
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(body.rememberMe === false ? {} : { maxAge: SESSION_MAX_AGE_SECONDS }),
    path: '/',
  })

  setResponseStatus(event, created ? 201 : 200)
  return { user: toPublicUser(user), created }
})
