interface PendingGoogleSignup {
  email: string
  firstName: string
  lastName: string
}

/**
 * Profil Google en attente d'inscription (#219) — déposé par le callback
 * dans un cookie httpOnly de courte durée pour ne jamais faire transiter
 * l'email/nom dans l'URL. Lu par /auth (mode `?google=1`) pour préremplir
 * le formulaire d'inscription.
 */
export default defineEventHandler((event): { pending: PendingGoogleSignup | null } => {
  const raw = getCookie(event, GOOGLE_SIGNUP_COOKIE)
  if (!raw) return { pending: null }
  try {
    const parsed = JSON.parse(raw) as Partial<PendingGoogleSignup>
    if (!parsed.email) return { pending: null }
    return {
      pending: {
        email: parsed.email,
        firstName: parsed.firstName ?? '',
        lastName: parsed.lastName ?? '',
      },
    }
  } catch {
    return { pending: null }
  }
})
