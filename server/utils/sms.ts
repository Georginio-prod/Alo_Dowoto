/**
 * Envoi de SMS transactionnels (OTP, #23) derrière une abstraction provider.
 *
 * Deux drivers disponibles, choisis via les variables d'environnement :
 *
 * 1. Brevo (prioritaire) — même API et même clé que l'email
 *    (server/utils/email.ts), donc un seul fournisseur pour email + SMS.
 *    Configuration :
 *    - BREVO_API_KEY     : clé API Brevo (partagée avec l'email).
 *    - BREVO_SMS_SENDER  : nom d'expéditeur affiché sur le SMS (alphanumérique,
 *                          11 caractères max, ex. "WorkTogo"). Doit être
 *                          configuré dans Brevo (Transactional > SMS > Settings).
 *    ⚠️ Le SMS Brevo n'est PAS gratuit : il faut acheter des crédits SMS
 *    (contrairement aux 300 emails/jour offerts).
 *
 * 2. Twilio (repli) — couvre les numéros togolais (+228) via son API REST.
 *    Configuration :
 *    - TWILIO_ACCOUNT_SID : SID du compte Twilio (commence par "AC").
 *    - TWILIO_AUTH_TOKEN  : jeton d'authentification du compte.
 *    - TWILIO_FROM        : numéro expéditeur E.164 (+1..., acheté chez Twilio)
 *                           ou SID d'un Messaging Service (commence par "MG").
 *
 * Sans provider configuré, aucun SMS ne part : les appelants gardent leur repli
 * développement (journalisation du code + devCode renvoyé au client).
 */

export type SendSmsResult =
  | { ok: true }
  | { ok: false; error: string }

function brevoSmsConfig() {
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SMS_SENDER
  if (!apiKey || !sender) return null
  return { apiKey, sender }
}

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!accountSid || !authToken || !from) return null
  return { accountSid, authToken, from }
}

/** Vrai si un provider SMS est configuré (les SMS partent réellement). */
export function isSmsConfigured(): boolean {
  return brevoSmsConfig() !== null || twilioConfig() !== null
}

/**
 * Envoie un SMS au numéro `to` (format E.164, ex. "+22890000000").
 * Ne lève jamais : les erreurs provider sont renvoyées dans le résultat
 * pour laisser l'appelant décider (journaliser, répondre 502, etc.).
 * Brevo est utilisé en priorité, Twilio en repli.
 */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const brevo = brevoSmsConfig()
  if (brevo) return sendViaBrevo(brevo, to, body)

  const twilio = twilioConfig()
  if (twilio) return sendViaTwilio(twilio, to, body)

  return { ok: false, error: 'Aucun provider SMS configuré (BREVO_API_KEY + BREVO_SMS_SENDER, ou TWILIO_* manquants).' }
}

async function sendViaBrevo(
  config: { apiKey: string; sender: string },
  to: string,
  body: string,
): Promise<SendSmsResult> {
  // Brevo attend le destinataire en format international sans le "+".
  const recipient = to.replace(/^\+/, '')
  try {
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: config.sender,
        recipient,
        content: body,
        type: 'transactional',
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { ok: false, error: `Brevo a répondu ${response.status} : ${detail.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: `Échec de l'appel Brevo SMS : ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function sendViaTwilio(
  config: { accountSid: string; authToken: string; from: string },
  to: string,
  body: string,
): Promise<SendSmsResult> {
  const params = new URLSearchParams({ To: to, Body: body })
  // Twilio accepte soit un numéro expéditeur, soit un Messaging Service.
  if (config.from.startsWith('MG')) params.set('MessagingServiceSid', config.from)
  else params.set('From', config.from)

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { ok: false, error: `Twilio a répondu ${response.status} : ${detail.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: `Échec de l'appel Twilio : ${error instanceof Error ? error.message : String(error)}` }
  }
}
