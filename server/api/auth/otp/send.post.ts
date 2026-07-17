import type { ContactMethod } from '~~/server/utils/contact'
import { isEmailConfigured, sendEmail } from '~~/server/utils/email'
import { isSmsConfigured, sendSms } from '~~/server/utils/sms'

interface SendOtpBody {
  method?: ContactMethod
  value?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SendOtpBody>(event)

  if (body?.method !== 'phone' && body?.method !== 'email') {
    badRequest('Méthode de contact invalide.')
  }

  const contact = normalizeContact(body.method, body.value ?? '')
  if (!contact) {
    badRequest(
      body.method === 'phone'
        ? 'Entrez un numéro valide (8 chiffres).'
        : 'Entrez une adresse email valide.',
    )
  }

  const result = await generateOtp(contact)
  if (!result.ok) {
    tooManyRequests('Veuillez patienter avant de renvoyer un code.', { retryAfterSeconds: result.retryAfterSeconds })
  }

  // Envoi réel quand un provider est configuré (#23) : SMS via Twilio
  // (server/utils/sms.ts) ou email via Brevo (server/utils/email.ts).
  const expiresInMinutes = Math.floor(result.expiresInSeconds / 60)
  const message = `WorkTogo : votre code de vérification est ${result.code}. Il expire dans ${expiresInMinutes} minutes.`
  const reallySent
    = body.method === 'phone' ? isSmsConfigured() : isEmailConfigured()

  if (reallySent) {
    const sent = body.method === 'phone'
      ? await sendSms(contact, message)
      : await sendEmail(contact, 'Votre code de vérification WorkTogo', message)
    if (!sent.ok) {
      console.error(`[otp] Échec d'envoi ${body.method === 'phone' ? 'du SMS' : "de l'email"} à ${contact} : ${sent.error}`)
      badGateway(
        body.method === 'phone'
          ? 'Impossible d’envoyer le SMS pour le moment. Réessayez dans quelques instants.'
          : 'Impossible d’envoyer l’email pour le moment. Réessayez dans quelques instants.',
      )
    }
  } else {
    // Repli développement : le code est journalisé côté serveur.
    console.warn(`[otp] Code ${result.code} pour ${contact} (expire dans ${result.expiresInSeconds}s)`)
  }

  return {
    ok: true,
    expiresInSeconds: result.expiresInSeconds,
    // Uniquement hors production et quand aucun envoi réel n'a eu lieu, pour
    // permettre de tester le parcours de bout en bout sans provider SMS/email.
    ...(process.env.NODE_ENV !== 'production' && !reallySent ? { devCode: result.code } : {}),
  }
})
