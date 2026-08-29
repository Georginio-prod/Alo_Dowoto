/**
 * Connexion du dashboard admin desktop (#admin).
 *
 * Distincte de /api/auth/session.post (qui exige une vérification OTP
 * préalable, adaptée au grand public) : l'admin s'authentifie directement par
 * email + mot de passe. La route renvoie un jeton de session porté ensuite en
 * `Authorization: Bearer <token>` par l'application Electron — pas de cookie,
 * l'app appelle l'API depuis son process Node. N'accorde jamais l'accès à un
 * compte non-admin : le message d'erreur reste volontairement générique pour
 * ne pas révéler l'existence d'un compte.
 */
import { isRateLimited, resetRateLimit } from '~~/server/utils/aiRateLimiter'
import { ADMIN_SESSION_TTL_MS, getUserTotpSecret } from '~~/server/utils/userStore'
import { verifyTotp } from '~~/server/utils/totp'

// Anti brute-force (audit M1) : au plus MAX_LOGIN_ATTEMPTS tentatives par IP et
// par fenêtre ; une connexion réussie remet le compteur à zéro (seules les
// tentatives infructueuses s'accumulent vers le blocage). Le backend étant
// exposé publiquement (tunnel ngrok), sans ce garde-fou un mot de passe admin
// serait brute-forçable.
const MAX_LOGIN_ATTEMPTS = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateKey = `admin-login:${ip}`
  if (await isRateLimited(rateKey, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)) {
    tooManyRequests('Trop de tentatives de connexion. Réessayez dans quelques minutes.')
  }

  const body = await readBody<{ email?: unknown; password?: unknown; totp?: unknown }>(event)

  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const totp = typeof body?.totp === 'string' ? body.totp : ''

  if (!email || !password) {
    badRequest('Email et mot de passe requis.')
  }

  const contact = normalizeContact('email', email)
  if (!contact) {
    unauthorized('Identifiants invalides.')
  }

  const user = await getUserByContact(contact)
  // Cast local : voir userStore.ts:AccountRole (le champ `role` reste typé
  // `Role` mais peut valoir `admin` en base).
  if (!user || (user.role as string) !== 'admin' || !user.passwordHash) {
    unauthorized('Identifiants invalides.')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    unauthorized('Identifiants invalides.')
  }

  // Double authentification (audit D-02) — opt-in : n'est exigée que si un
  // secret TOTP a été provisionné pour ce compte (scripts/enable-admin-totp.mjs).
  // Un admin sans secret se connecte comme avant, aucun blocage au déploiement.
  const totpSecret = await getUserTotpSecret(user.id)
  if (totpSecret) {
    if (!totp) {
      // Signal distinct pour que l'app desktop affiche le champ « code » et
      // redemande la connexion avec le code (ne compte pas comme identifiants
      // erronés — l'utilisateur a prouvé son mot de passe).
      throw createError({ statusCode: 401, statusMessage: 'Code de vérification à deux facteurs requis.', data: { mfaRequired: true } })
    }
    if (!verifyTotp(totpSecret, totp)) {
      unauthorized('Code de vérification invalide.')
    }
  }

  // Session admin à durée de vie courte (12 h) — voir ADMIN_SESSION_TTL_MS.
  const token = await createSession(user.id, ADMIN_SESSION_TTL_MS)
  const permissions = await getAdminPermissions(user.id)

  // Connexion réussie : on remet le compteur anti brute-force à zéro pour cette IP.
  await resetRateLimit(rateKey)

  return { token, user: toPublicUser(user), permissions, isSuperAdmin: permissions === null }
})
