const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export default defineEventHandler(async (event) => {
  const body = await readSchemaBody(event, createSessionSchema)

  const contact = normalizeContact(body.method, body.value)
  if (!contact) {
    badRequest('Contact invalide.')
  }

  if (!await consumeVerifiedContact(contact)) {
    unauthorized("Ce contact n'a pas été vérifié par code OTP (voir /api/auth/otp/verify).")
  }

  // Coordonnées optionnelles : une paire invalide/partielle est simplement
  // ignorée plutôt que de faire échouer l'inscription — ce n'est qu'un bonus
  // par rapport à la ville en texte libre (obligatoire, voir `location`).
  const hasValidCoords = isValidCoordinatePair(body.latitude, body.longitude)

  const { user, created } = await findOrCreateUser(contact, body.role, {
    username: body.username ?? '',
    firstName: body.firstName ?? '',
    lastName: body.lastName ?? '',
    location: body.location ?? '',
    ...(hasValidCoords ? { latitude: body.latitude, longitude: body.longitude } : {}),
  })

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

  const token = await createSession(user.id)
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
