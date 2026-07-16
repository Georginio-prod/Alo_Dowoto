interface SetPasswordBody {
  currentPassword?: string
  password?: string
  confirmPassword?: string
}

/**
 * Sert deux usages :
 *  - Étape « Créer votre mot de passe », obligatoire juste après la
 *    vérification OTP à l'inscription (#125). Le compte reste "non
 *    finalisé" (voir `hasPassword`) tant que cette route n'a pas été
 *    appelée avec succès une première fois.
 *  - Changement de mot de passe depuis « Mon espace » une fois le compte
 *    finalisé : exige alors `currentPassword` (vérifié) pour empêcher
 *    qu'une session détournée ne verrouille le vrai titulaire du compte.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  const body = await readBody<SetPasswordBody>(event)
  const password = body?.password ?? ''
  const confirmPassword = body?.confirmPassword ?? ''

  if (hasPassword(user)) {
    const currentPassword = body?.currentPassword ?? ''
    if (!currentPassword) {
      badRequest('Le mot de passe actuel est requis.')
    }
    const currentValid = await verifyPassword(currentPassword, user.passwordHash ?? '')
    if (!currentValid) {
      unauthorized('Mot de passe actuel incorrect.')
    }
  }

  if (password !== confirmPassword) {
    badRequest('Les mots de passe ne correspondent pas.')
  }

  const strength = checkPasswordStrength(password)
  if (!strength.ok) {
    badRequest(`Mot de passe trop faible : il manque ${strength.reasons.join(', ')}.`, { reasons: strength.reasons })
  }

  const passwordHash = await hashPassword(password)
  await setPasswordHash(user.id, passwordHash)

  return { user: toPublicUser({ ...user, passwordHash }) }
})
