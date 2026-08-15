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
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; password?: unknown }>(event)

  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''

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

  const token = await createSession(user.id)

  return { token, user: toPublicUser(user) }
})
