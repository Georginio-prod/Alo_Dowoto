import { isEmailConfigured, sendEmail } from '~~/server/utils/email'
import { isSmsConfigured, sendSms } from '~~/server/utils/sms'
import { isRateLimited } from '~~/server/utils/aiRateLimiter'

// Plafond anti-abus par IP (audit S-05) : le cooldown de 30 s d'otpStore ne
// protège que d'un renvoi répété au MÊME contact. Sans limite par IP, un script
// peut demander un OTP pour des milliers de numéros différents (« SMS pumping »)
// et faire flamber la facture Twilio. Fenêtre volontairement large et plafond
// tolérant : au Togo, le NAT opérateur (CGNAT) place beaucoup d'utilisateurs
// légitimes derrière une même IP publique — une limite trop serrée les
// bloquerait. 20 envois / 15 min bloque le pompage massif sans gêner l'usage
// normal (au plus quelques codes par personne).
//
// Uniquement en production, comme la CSP et HSTS (server/middleware/security.ts) :
// la suite e2e crée de nombreux comptes depuis une seule IP (localhost, serveur
// `npm run dev`) et dépasserait le plafond — sans intérêt puisque l'instance de
// dev n'est pas exposée et que le SMS y est simulé (aucun coût réel).
const MAX_OTP_PER_IP = 20
const OTP_IP_WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
    if (await isRateLimited(`otp-send:${ip}`, MAX_OTP_PER_IP, OTP_IP_WINDOW_MS)) {
      tooManyRequests('Trop de demandes de code depuis ce réseau. Réessayez dans quelques minutes.')
    }
  }

  const body = await readSchemaBody(event, sendOtpSchema)

  const contact = normalizeContact(body.method, body.value)
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
