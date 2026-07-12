import type { ContactMethod } from '~~/server/utils/contact'

interface SendOtpBody {
  method?: ContactMethod
  value?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SendOtpBody>(event)

  if (body?.method !== 'phone' && body?.method !== 'email') {
    throw createError({ statusCode: 400, statusMessage: 'Méthode de contact invalide.' })
  }

  const contact = normalizeContact(body.method, body.value ?? '')
  if (!contact) {
    throw createError({
      statusCode: 400,
      statusMessage:
        body.method === 'phone'
          ? 'Entrez un numéro valide (8 chiffres).'
          : 'Entrez une adresse email valide.',
    })
  }

  const result = generateOtp(contact)
  if (!result.ok) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Veuillez patienter avant de renvoyer un code.',
      data: { retryAfterSeconds: result.retryAfterSeconds },
    })
  }

  // TODO(#23): brancher un provider SMS togolais (à définir) et un provider
  // email réel. En attendant, on journalise l'envoi côté serveur.
  console.warn(`[otp] Code ${result.code} pour ${contact} (expire dans ${result.expiresInSeconds}s)`)

  return {
    ok: true,
    expiresInSeconds: result.expiresInSeconds,
    // Uniquement hors production, pour permettre de tester le parcours de
    // bout en bout sans provider SMS/email réel.
    ...(process.env.NODE_ENV !== 'production' ? { devCode: result.code } : {}),
  }
})
