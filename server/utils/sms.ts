/**
 * Envoi de SMS transactionnels (OTP, #23) derrière une abstraction provider.
 *
 * Driver actuel : Twilio via son API REST (couvre les numéros togolais
 * Togocom/Moov, +228), sans dépendance npm — un simple POST authentifié
 * suffit. Le jour où un agrégateur SMS local est contractualisé, il suffira
 * d'ajouter un driver ici sans toucher aux routes qui appellent sendSms().
 *
 * Configuration (voir .env.example) :
 * - TWILIO_ACCOUNT_SID : SID du compte Twilio (commence par "AC")
 * - TWILIO_AUTH_TOKEN  : jeton d'authentification du compte
 * - TWILIO_FROM        : numéro expéditeur E.164 (+1..., acheté chez Twilio)
 *                        ou SID d'un Messaging Service (commence par "MG")
 *
 * Sans ces variables, aucun SMS ne part : les appelants gardent leur repli
 * développement (journalisation du code + devCode renvoyé au client).
 */

export type SendSmsResult =
  | { ok: true }
  | { ok: false; error: string }

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!accountSid || !authToken || !from) return null
  return { accountSid, authToken, from }
}

/** Vrai si un provider SMS est configuré (les SMS partent réellement). */
export function isSmsConfigured(): boolean {
  return twilioConfig() !== null
}

/**
 * Envoie un SMS au numéro `to` (format E.164, ex. "+22890000000").
 * Ne lève jamais : les erreurs provider sont renvoyées dans le résultat
 * pour laisser l'appelant décider (journaliser, répondre 502, etc.).
 */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const config = twilioConfig()
  if (!config) {
    return { ok: false, error: 'Aucun provider SMS configuré (TWILIO_* manquants).' }
  }

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
