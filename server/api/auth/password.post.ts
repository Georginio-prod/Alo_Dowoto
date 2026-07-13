interface SetPasswordBody {
  password?: string
  confirmPassword?: string
}

/**
 * Étape « Créer votre mot de passe », obligatoire juste après la
 * vérification OTP à l'inscription (#125). Le compte reste "non finalisé"
 * (voir `hasPassword`) tant que cette route n'a pas été appelée avec
 * succès — utilisé par le front pour bloquer l'accès aux étapes suivantes.
 */
export default defineEventHandler(async (event) => {
  const user = requireSessionUser(event)

  const body = await readBody<SetPasswordBody>(event)
  const password = body?.password ?? ''
  const confirmPassword = body?.confirmPassword ?? ''

  if (password !== confirmPassword) {
    badRequest('Les mots de passe ne correspondent pas.')
  }

  const strength = checkPasswordStrength(password)
  if (!strength.ok) {
    badRequest(`Mot de passe trop faible : il manque ${strength.reasons.join(', ')}.`, { reasons: strength.reasons })
  }

  const passwordHash = await hashPassword(password)
  setPasswordHash(user.id, passwordHash)

  return { user: toPublicUser({ ...user, passwordHash }) }
})
